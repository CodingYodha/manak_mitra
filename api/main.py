import os
import pathlib

# Automatically load .env file
_ROOT = pathlib.Path(__file__).parent.parent
_env_file = _ROOT / ".env"
if _env_file.exists():
    with open(_env_file, encoding="utf-8") as _ef:
        for _l in _ef:
            _l = _l.strip()
            if _l and not _l.startswith("#") and "=" in _l:
                _k, _v = _l.split("=", 1)
                os.environ.setdefault(_k.strip(), _v.strip())

import asyncio
import json
from fastapi import FastAPI, UploadFile, File, Form, Query, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from api import answers, azure_openai, guard, store, marks, lang as lang_utils
from typing import Optional
import datetime
import os
import re
import httpx

app = FastAPI(title="Manak Mitra API", description="AI Assistant for Bureau of Indian Standards (BIS)", version="2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

STT_UPSTREAM_HTTP = os.environ.get("REALTIMESTT_URL", "http://127.0.0.1:8010").rstrip("/")
MAX_STT_AUDIO_BYTES = int(os.environ.get("MAX_STT_AUDIO_BYTES", 16000 * 2 * 120))


def _normalize_stt_domain_text(value: str) -> str:
    """Correct conservative, known ASR spellings for BIS terminology."""
    text = " ".join(str(value or "").split())
    replacements = (
        (r"\bB[. ]*I[. ]*S[.]?\b", "BIS"),
        (r"\bQ[. ]*C[. ]*O[.]?\b", "QCO"),
        (r"\bC[. ]*M\s*/?\s*L\b", "CM/L"),
        (r"\bH[. ]*U[. ]*I[. ]*D[.]?\b", "HUID"),
        (r"बी\s*आई\s*एस", "BIS"),
        (r"एल\s*ई\s*डी", "LED"),
        (r"क्यू\s*सी\s*ओ", "QCO"),
        (r"एच\s*यू\s*आई\s*डी", "HUID"),
        (r"वात", "वाट"),
        (r"बल्ग", "बल्ब"),
        (r"प्रमानन", "प्रमाणन"),
        (r"अनिवारे", "अनिवार्य"),
    )
    for pattern, replacement in replacements:
        text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
    return text


@app.get("/api/stt/status")
async def stt_status():
    """Report optional local RealtimeSTT readiness without blocking the assistant."""
    try:
        async with httpx.AsyncClient(timeout=1.5) as client:
            response = await client.get(f"{STT_UPSTREAM_HTTP}/api/v1/ready")
        payload = response.json() if response.content else {}
        return {
            "available": response.status_code == 200 and payload.get("ready", True),
            "engine": payload.get("engine") or payload.get("provider") or "RealtimeSTT",
            "model": payload.get("model"),
            "multilingual": True,
            "languages": ["auto", "en", "hi"],
        }
    except Exception:
        return {
            "available": False,
            "engine": "RealtimeSTT",
            "model": None,
            "multilingual": True,
            "languages": ["auto", "en", "hi"],
        }


@app.websocket("/ws/stt")
async def stt_websocket_proxy(client_socket: WebSocket):
    """Stream browser PCM to local RealtimeSTT with live partials and a final pass.

    The production HTTP inference endpoint is used deliberately: the speech
    sidecar remains private on loopback, while this stable browser protocol is
    independent of upstream WebSocket implementation changes.
    """
    await client_socket.accept()
    send_lock = asyncio.Lock()
    preview_task = None
    audio = bytearray()
    expected_sequence = 0
    last_preview_length = 0
    language = "auto"
    turn_id = None

    async def send(payload):
        async with send_lock:
            await client_socket.send_json(payload)

    async def transcribe(client, pcm, beam_size):
        response = await client.post(
            f"{STT_UPSTREAM_HTTP}/transcribe-pcm16",
            params={
                "sample_rate": 16000,
                "encoding": "pcm16",
                "language": language,
                "beam_size": beam_size,
                "best_of": 1,
                "vad_filter": "false",
            },
            content=pcm,
            headers={"content-type": "application/octet-stream"},
        )
        response.raise_for_status()
        return response.json()

    async def emit_preview(client, pcm_snapshot):
        try:
            result = await transcribe(client, pcm_snapshot, 1)
            text = _normalize_stt_domain_text(result.get("text") or "")
            if text:
                await send({
                    "type": "realtime",
                    "turnId": turn_id,
                    "text": text,
                    "mergedText": text,
                    "language": result.get("detected_language") or language,
                })
        except Exception:
            # A partial is advisory; the accurate final pass still owns errors.
            return

    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(75, connect=2)) as client:
            readiness = await client.get(f"{STT_UPSTREAM_HTTP}/api/v1/ready")
            readiness.raise_for_status()
            await send({"type": "hello", "capabilities": {"languages": ["auto", "en", "hi"]}})
            await send({"type": "ready", "ready": True})

            while True:
                message = await client_socket.receive()
                if message.get("type") == "websocket.disconnect":
                    return

                if message.get("text") is not None:
                    command = json.loads(message["text"])
                    command_type = command.get("type")
                    if command_type == "start":
                        turn_id = str(command.get("turnId") or f"manak-{datetime.datetime.now().timestamp()}")
                        requested_language = str(command.get("language") or "auto").lower()
                        language = requested_language if requested_language in {"auto", "en", "hi"} else "auto"
                        await send({"type": "started", "turnId": turn_id, "language": language})
                    elif command_type == "cancel":
                        return
                    elif command_type == "finalize":
                        if preview_task is not None:
                            preview_task.cancel()
                        if not audio:
                            await send({"type": "error", "code": "empty_audio", "message": "No speech was detected."})
                            await send({"type": "completion", "turnId": turn_id})
                            return
                        result = await transcribe(client, bytes(audio), 5)
                        await send({
                            "type": "final",
                            "turnId": turn_id,
                            "text": _normalize_stt_domain_text(result.get("text") or ""),
                            "detectedLanguage": result.get("detected_language") or language,
                            "languageProbability": result.get("language_probability"),
                            "inferenceMs": round(float(result.get("elapsed_seconds") or 0) * 1000),
                        })
                        await send({"type": "completion", "turnId": turn_id})
                        return
                    continue

                packet = message.get("bytes")
                if packet is None or len(packet) < 5 or turn_id is None:
                    continue
                metadata_size = int.from_bytes(packet[:4], "little")
                if metadata_size <= 0 or 4 + metadata_size >= len(packet):
                    await send({"type": "error", "code": "invalid_audio", "message": "Invalid audio packet."})
                    continue
                metadata = json.loads(packet[4:4 + metadata_size].decode("utf-8"))
                if (
                    metadata.get("sampleRate") != 16000
                    or metadata.get("channels") != 1
                    or metadata.get("format") != "pcm_s16le"
                ):
                    await send({"type": "error", "code": "audio_format", "message": "Audio must be mono PCM16 at 16 kHz."})
                    continue
                sequence = int(metadata.get("audioSequence", -1))
                if sequence != expected_sequence:
                    await send({"type": "error", "code": "audio_sequence", "message": "Audio packets arrived out of sequence."})
                    continue
                expected_sequence += 1
                pcm = packet[4 + metadata_size:]
                if len(audio) + len(pcm) > MAX_STT_AUDIO_BYTES:
                    await send({"type": "error", "code": "audio_limit", "message": "Voice input is limited to two minutes."})
                    await send({"type": "completion", "turnId": turn_id})
                    return
                audio.extend(pcm)

                # Do not spend the large model on partials for short questions;
                # one preview begins after six seconds, preserving fast finals.
                preview_interval = 192000
                if len(audio) >= preview_interval and (
                    preview_task is None or preview_task.done()
                ):
                    if len(audio) - last_preview_length >= preview_interval:
                        last_preview_length = len(audio)
                        preview_task = asyncio.create_task(emit_preview(client, bytes(audio)))
    except WebSocketDisconnect:
        return
    except Exception:
        try:
            await client_socket.send_json({
                "type": "error",
                "code": "local_stt_unavailable",
                "message": "The local multilingual speech engine is unavailable.",
            })
            await client_socket.close(code=1013)
        except Exception:
            pass
    finally:
        if preview_task is not None and not preview_task.done():
            preview_task.cancel()


def route(q: str) -> str:
    ql = q.lower().strip()
    huid_candidate = re.search(r"\b[0-9A-Z]{6}\b", q, re.I)
    has_huid_code = bool(huid_candidate and any(char.isdigit() for char in huid_candidate.group()) and any(char.isalpha() for char in huid_candidate.group()))
    has_registry_code = bool(re.search(r"\b(?:cm/l[- ]?\d{7}|r[- ]?\d{8})\b", ql, re.I))
    # 0. Friendly greetings, pleasantries, identity queries
    if re.search(r"^\s*(hi|hello|hey|hii+|heyy+|namaste|नमस्ते|नमस्कार|सुप्रभात|who are you|what can you do|help|thanks|thank you|धन्यवाद)\b", ql) or ql in ["hi", "hii", "hello", "hey", "heyy", "namaste", "नमस्ते"]:
        return "greeting"
    if re.search(r"\b(passport|dossier|compliance report|पासपोर्ट)\b", ql):
        return "passport"
    if has_huid_code or has_registry_code or re.search(r"\b(verify|fake|counterfeit|check (?:a |this )?(?:mark|code)|जांच|सत्यापन)\b", ql):
        return "consumer"
    if re.search(r"\b(scheme|crs|isi|fmcs|hallmark|hallmarking|huid|gold|process|fees|steps|application|how to apply|requirements|rules|लाइसेंस|प्रक्रिया|शुल्क|हॉलमार्क)\b", ql):
        return "scheme"
    if re.search(r"\b(lab|testing|test house|where to test|sample|प्रयोगशाला|टेस्टिंग)\b", ql):
        return "labs"
    if re.search(r"\b(mandatory|compulsory|do i need|require|qco|order|अनिवार्य|ज़रूरी)\b", ql):
        return "mandate"
    return "recommend"


def extract_city(q: str) -> str:
    """Extracts major Indian cities from user query if present."""
    cities = [
        "delhi", "new delhi", "mumbai", "bangalore", "bengaluru", "chennai", "kolkata",
        "hyderabad", "ahmedabad", "pune", "jaipur", "lucknow", "kanpur", "nagpur",
        "patna", "indore", "bhopal", "vadodara", "surat", "visakhapatnam", "tirupati",
        "guwahati", "raipur", "daman", "noida", "gurugram", "ghaziabad", "faridabad"
    ]
    ql = q.lower()
    for c in cities:
        if re.search(rf"\b{c}\b", ql):
            return c.title()
    return ""


def catalogue_anchor(query: str) -> Optional[dict]:
    """Resolve a natural-language product question to the strongest QCO item."""
    candidates = store.passport_candidates(query, limit=3)
    if not candidates or candidates[0].get("match_score", 0) < 0.6:
        return None
    return candidates[0]


@app.on_event("startup")
def on_startup():
    store.init()
    # Keep the API responsive while the large graph is idle.  Graph routes load
    # the same cached graph on first use; verifier and scheme routes need not
    # wait for that expensive deserialisation.
    try:
        from api import graph_store
        if graph_store.is_ready():
            print("[main] Knowledge graph will load on its first graph request")
        else:
            print("[main] graph.gpickle not found — run: python api/graph_build.py")
    except Exception as e:
        print(f"[main] Graph load skipped: {e}")


GATEKEEPER_PROMPT = """You are Manak Mitra (मानक मित्र), the official AI Compliance Assistant for Bureau of Indian Standards (BIS), Ministry of Consumer Affairs, Government of India.

Your core domain is Indian Standards (IS), Quality Control Orders (QCOs), testing laboratories (340+ across India and 6 Apex Testing Hubs), certification schemes (ISI Mark, CRS, FMCS), and Hallmarking (HUID).

TASK:
Analyze the user message and perform one of the following actions:

1. IF GIBBERISH / NONSENSE / RANDOM CHARACTERS / OUT-OF-CONTEXT NUMBERS (e.g., 'asdkjhasd', '123891723', 'qwerty', '???', random keystrokes):
   Do NOT pass this to the standards engine. Respond politely and gently:
   - State that you did not understand or catch the query.
   - Clarify that you are Manak Mitra, the official BIS AI Assistant.
   - Ask if they are looking for information on a specific product, an Indian Standard (IS), a mandatory Quality Control Order (QCO), or a testing laboratory.

2. IF CASUAL / GREETING / CHIT-CHAT / IDENTITY / GRATITUDE (e.g., 'hi', 'hii', 'hello', 'namaste', 'who are you', 'how are you', 'what can you do', 'thanks'):
   Do NOT cite standard numbers. Do NOT pass to the standards engine. Respond warmly, casually, and informatively:
   - Introduce yourself as Manak Mitra (मानक मित्र), the official BIS AI Compliance Assistant.
   - Informatively explain your key capabilities (Mandatory QCOs, 23,500+ Indian Standards, 340+ testing labs, ISI/CRS/FMCS certification processes, and HUID hallmark verification).
   - Invite them to ask about any product, standard, or compliance requirement.
   - Respond in the language of the user (Hindi for Hindi/Hinglish, English for English).

3. IF COMPLIANCE / TECHNICAL / REGULATORY QUERY (e.g., 'Is BIS mandatory for 9W LED bulb?', 'IS 16102', 'gold hallmarking', 'testing lab in Delhi', 'how to get ISI mark', or any question asking about specific goods, standards, certification, or laboratories):
   Respond with ONLY the exact keyword token: [COMPLIANCE_QUERY]"""


def classify_gatekeeper(q: str, is_hi: bool = False) -> Optional[str]:
    """
    Evaluates queries via LLM before semantic retrieval.
    Returns direct string reply for casual/gibberish queries, or None to pass to RAG backend.
    """
    # 1. Primary: Azure OpenAI.  The shared client uses api-key and the
    # verified max_completion_tokens parameter for the configured model.
    azure_key = os.environ.get("AZURE_OPENAI_API_KEY")
    if azure_key:
        content = azure_openai.complete(
            [
                {"role": "system", "content": GATEKEEPER_PROMPT},
                {"role": "user", "content": q},
            ],
            api_key=azure_key,
            max_completion_tokens=300,
            timeout=8.0,
        )
        if content:
            if "[COMPLIANCE_QUERY]" in content:
                return None
            return content

    # 2. Secondary: Groq API
    groq_key = os.environ.get("GROQ_API_KEY")
    if groq_key:
        try:
            model = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")
            headers = {"Authorization": f"Bearer {groq_key}", "Content-Type": "application/json"}
            payload = {
                "model": model,
                "messages": [
                    {"role": "system", "content": GATEKEEPER_PROMPT},
                    {"role": "user", "content": q}
                ],
                "temperature": 0.1,
                "max_tokens": 300
            }
            with httpx.Client(timeout=4.0) as client:
                resp = client.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=payload)
                if resp.status_code == 200:
                    content = resp.json()["choices"][0]["message"]["content"].strip()
                    if "[COMPLIANCE_QUERY]" in content:
                        return None
                    return content
        except Exception:
            pass

    # Heuristic fallback if LLM is unreachable
    ql = q.lower().strip()
    has_product = bool(re.search(r"(led|bulb|toy|gold|cement|steel|helmet|cable|wire|battery|water|lab|huid|qco|isi|crs|fmcs|is\s*\d+)", ql))
    if not has_product:
        if re.search(r"^\s*(hi|hello|hey|hii+|heyy+|namaste|नमस्ते|नमस्कार|सुप्रभात|who are you|what can you do|help|thanks|thank you)\b", ql) or len(ql) <= 4:
            if is_hi:
                return (
                    "नमस्ते! 🙏 मैं *मानक मित्र (Manak Mitra)* हूँ — भारतीय मानक ब्यूरो (BIS) का आधिकारिक AI अनुपालन सहायक।\n\n"
                    "मैं आपकी इन विषयों में सहायता कर सकता हूँ:\n"
                    "• *अनिवार्य QCOs*: जांचें कि क्या आपके उत्पाद पर सरकारी गुणवत्ता नियंत्रण आदेश लागू है\n"
                    "• *भारतीय मानक*: 23,500+ भारतीय मानक\n"
                    "• *परीक्षण प्रयोगशालाएं*: देश भर की 340+ मान्यता प्राप्त लैब्स खोजें\n"
                    "• *प्रमाणीकरण योजनाएं*: ISI मार्क, CRS, FMCS प्रक्रियाएं\n"
                    "• *हॉलमार्क सत्यापन*: 6-अंकीय HUID एवं CM/L लाइसेंस जांच\n\n"
                    "आज मैं आपकी क्या सहायता कर सकता हूँ?"
                )
            return (
                "Namaste! 🙏 I am Manak Mitra, your official AI Compliance Assistant for the Bureau of Indian Standards (BIS), Government of India.\n\n"
                "Here is what I can assist you with:\n"
                "• Mandatory Quality Control Orders (QCOs)\n"
                "• Indian Standards (IS Numbers, e.g. IS 16102 for LED bulbs)\n"
                "• Finding nearest accredited testing laboratories across 340+ facilities\n"
                "• Certification schemes & fees (ISI Mark, CRS, FMCS, Hallmarking)\n"
                "• Validating 6-digit HUID gold hallmarks & CM/L licenses\n\n"
                "How can I help with your compliance today?"
            )
        if re.match(r"^[a-z0-9\W_]{1,15}$", ql) and not re.search(r"[a-z]{3,}\s+[a-z]{3,}", ql):
            return "I'm sorry, I didn't quite catch that. I am Manak Mitra, your official BIS AI Assistant. Are you looking for information on an Indian Standard (IS), mandatory Quality Control Order (QCO), or a testing laboratory?"

    return None


def _evaluate_query(q: str, lang: str = "en", channel: str = "web"):
    is_hi = lang_utils.is_hindi(q) or lang == "hi"
    user_lang = "hi" if is_hi else lang

    # Translate Hindi input query to English for intent routing & standards vector search
    query_en = lang_utils.translate(q, src="hi", tgt="en") if is_hi else q

    intent = route(query_en)
    city = extract_city(query_en) or extract_city(q)

    # ── 0. AI Gatekeeper (Casual / Gibberish / Pleasantry Interceptor) ────────
    if intent in ("greeting", "recommend"):
        gatekeeper_reply = classify_gatekeeper(q, is_hi=is_hi)
        if gatekeeper_reply:
            return {
                "intent": "conversational",
                "is_hi": is_hi,
                "user_lang": user_lang,
                "query_en": query_en,
                "facts": {},
                "top": 1.0,
                "abstained": False,
                "citations": [],
                "refs": [],
                "direct_answer": gatekeeper_reply,
                "verification": None,
                "passport_url": ""
            }

    # ── 0b. Greeting Fallback ────────────────────────────────────────────────
    if intent == "greeting":
        if is_hi:
            greeting_text = (
                "नमस्ते! 🙏 मैं *मानक मित्र (Manak Mitra)* हूँ — भारतीय मानक ब्यूरो (BIS), उपभोक्ता मामले मंत्रालय का आधिकारिक AI अनुपालन सहायक।\n\n"
                "आप मुझसे निम्न के बारे में पूछ सकते हैं:\n"
                "• अनिवार्य गुणवत्ता नियंत्रण आदेश (QCOs)\n"
                "• भारतीय मानक (IS Numbers जैसे LED के लिए IS 16102)\n"
                "• देश भर की 340+ मान्यता प्राप्त परीक्षण प्रयोगशालाएं\n"
                "• प्रमाणीकरण प्रक्रियाएं एवं शुल्क (ISI, CRS, FMCS, हॉलमार्किंग)\n"
                "• 6-अंकीय HUID हॉलमार्क एवं CM/L लाइसेंस जांच\n\n"
                "आज मैं आपकी क्या सहायता कर सकता हूँ?"
            )
        else:
            greeting_text = (
                "Namaste! 🙏 I am Manak Mitra, your official AI Compliance Assistant for the Bureau of Indian Standards (BIS), Government of India.\n\n"
                "Here is what I can assist you with:\n"
                "• Mandatory Quality Control Orders (QCOs)\n"
                "• Indian Standards (IS Numbers, e.g. IS 16102 for LED bulbs)\n"
                "• Finding nearest accredited testing laboratories across 340+ facilities\n"
                "• Certification schemes & fees (ISI Mark, CRS, FMCS, Hallmarking)\n"
                "• Validating 6-digit HUID gold hallmarks & CM/L licenses\n\n"
                "How can I help with your compliance today?"
            )

        return {
            "intent": intent,
            "is_hi": is_hi,
            "user_lang": user_lang,
            "query_en": query_en,
            "facts": {},
            "top": 1.0,
            "abstained": False,
            "citations": [],
            "refs": [],
            "direct_answer": greeting_text,
            "verification": None,
            "passport_url": ""
        }

    # ── 1. Consumer / Mark Verification ──────────────────────────────────────
    elif intent == "consumer":
        # Extract potential code if present in query
        code_match = re.search(r"\b([0-9A-Z]{6}|CM/L[- ]?\d{7}|R[- ]?\d{8})\b", q, re.I)
        code = code_match.group(1) if code_match else q
        mark_res = marks.verify_mark(code)

        citations = mark_res.get("citations", [])
        facts = {
            "mark_verification": mark_res,
            "citations": citations
        }
        answer_text = mark_res.get("reason", "Mark verification complete.")
        if is_hi:
            answer_text = lang_utils.translate(answer_text, src="en", tgt="hi")
        refs = list(dict.fromkeys([
            c["ref"] for c in citations
            if c.get("kind") == "standard" and c.get("ref")
        ]))
        grounding = answers.graph_grounding(refs, product_hint=query_en)
        if grounding.get("available"):
            facts["knowledge_graph"] = grounding

        return {
            "intent": intent,
            "is_hi": is_hi,
            "user_lang": user_lang,
            "query_en": query_en,
            "facts": facts,
            "top": 1.0,
            "abstained": False,
            "citations": citations,
            "refs": refs,
            "grounding": grounding,
            "direct_answer": answer_text,
            "verification": mark_res,
            "passport_url": ""
        }

    # ── 2. Scheme & Process Guidance ─────────────────────────────────────────
    elif intent == "scheme":
        scheme_facts = answers.scheme(query_en)
        recommendation = answers.recommend(query_en)
        anchor = catalogue_anchor(query_en)
        mandate_facts = answers.mandate(anchor["is_number"]) if anchor else {}
        facts = {
            **scheme_facts,
            "hits": recommendation.get("hits", []),
            "web_hits": list({item.get("url"): item for item in (scheme_facts.get("web_hits", []) + recommendation.get("web_hits", [])) if item.get("url")}.values()),
            "citations": mandate_facts.get("citations", []) + scheme_facts.get("citations", []) + recommendation.get("citations", []),
            "_top_score": max(scheme_facts.get("_top_score", 0.0), recommendation.get("_top_score", 0.0)),
        }
        if anchor:
            facts.update({
                "mandatory": True,
                "is_number": anchor.get("is_number"),
                "product_desc": anchor.get("product_desc"),
                "qco_title": anchor.get("qco_title"),
                "effective_on": anchor.get("effective_on"),
            })

    # ── 3. Laboratory Lookup ────────────────────────────────────────────────
    elif intent == "labs":
        rec = answers.recommend(query_en)
        top_is = rec["hits"][0]["is_number"] if rec.get("hits") else None
        facts = answers.labs(city=city, category=query_en, is_number=top_is)

    # ── 4. Compliance Passport ──────────────────────────────────────────────
    elif intent == "passport":
        facts = answers.passport(query_en)

    # ── 5. Mandate & Standards Search ───────────────────────────────────────
    elif intent == "mandate":
        anchor = catalogue_anchor(query_en)
        facts = answers.mandate(anchor["is_number"] if anchor else query_en)
        if anchor and facts.get("mandatory"):
            facts.update({
                "is_number": anchor.get("is_number"),
                "product_desc": anchor.get("product_desc"),
                "qco_title": anchor.get("qco_title"),
                "effective_on": anchor.get("effective_on"),
                "scheme": anchor.get("scheme") or facts.get("scheme"),
            })
        if not facts.get("mandatory"):
            rec = answers.recommend(query_en)
            hits = rec.get("hits", [])
            if hits:
                qco_rows = []
                matched_hit = hits[0]
                for h in hits[:5]:
                    rows = store.mandate_for(h["is_number"])
                    if rows:
                        qco_rows = rows
                        matched_hit = h
                        break

                if qco_rows:
                    r = qco_rows[0]
                    web_hits = rec.get("web_hits", []) or facts.get("web_hits", [])
                    web_cits = [c for c in rec.get("citations", []) if c.get("kind") == "web"] or [c for c in facts.get("citations", []) if c.get("kind") == "web"]
                    facts = {
                        "mandatory": True,
                        "scheme": r["scheme"],
                        "is_number": r["is_number"],
                        "effective_on": r.get("effective_on"),
                        "qco_title": r.get("qco_title"),
                        "product_desc": r.get("product_desc"),
                        "hits": [matched_hit] + [h for h in hits if h["is_number"] != matched_hit["is_number"]],
                        "web_hits": web_hits,
                        "citations": [{
                            "kind": "qco",
                            "ref": r.get("is_number") or r.get("qco_title"),
                            "title": r.get("qco_title"),
                            "url": r.get("gazette_url"),
                            "retrieved_on": r.get("retrieved_on", "2026-09-09")
                        }] + [c for c in rec.get("citations", []) if c.get("ref") == r.get("is_number")] + [c for c in rec.get("citations", []) if c.get("ref") != r.get("is_number") and c.get("kind") != "web"] + web_cits
                    }
                else:
                    facts = rec
            else:
                facts = rec

    else:
        facts = answers.recommend(query_en)

    # ── Abstention & Confidence Check ───────────────────────────────────────
    hits = facts.get("hits", [])
    if hits:
        top = hits[0].get("dense_score", hits[0].get("score", 0.0))
    elif facts.get("citations"):
        top = 1.0
    else:
        top = facts.get("_top_score", 0.0)

    citations = facts.get("citations", [])
    refs = list(dict.fromkeys([
        c["ref"] for c in citations
        if c.get("kind") == "standard" and c.get("ref")
    ]))
    if facts.get("is_number"):
        refs = [facts["is_number"]] + [ref for ref in refs if ref != facts["is_number"]]
    grounding = answers.graph_grounding(refs, product_hint=query_en)
    if grounding.get("available"):
        facts["knowledge_graph"] = grounding
    passport_url = f"/passport/{query_en}" if intent in ["mandate", "recommend", "passport"] or facts.get("product_desc") else ""
    passport_product = facts.get("product_desc") or query_en

    if guard.should_abstain(top):
        refusal_answer = lang_utils.translate(guard.REFUSAL, src="en", tgt="hi") if is_hi else guard.REFUSAL
        return {
            "intent": intent,
            "is_hi": is_hi,
            "user_lang": user_lang,
            "query_en": query_en,
            "facts": facts,
            "top": top,
            "abstained": True,
            "citations": [],
            "refs": [],
            "grounding": grounding,
            "direct_answer": refusal_answer,
            "passport_url": "",
            "passport_product": passport_product
        }

    return {
        "intent": intent,
        "is_hi": is_hi,
        "user_lang": user_lang,
        "query_en": query_en,
        "facts": facts,
        "top": top,
        "abstained": False,
        "citations": citations,
        "refs": refs,
        "grounding": grounding,
        "direct_answer": None,
        "passport_url": passport_url,
        "passport_product": passport_product
    }


@app.post("/chat")
def chat(q: str, lang: str = "en", channel: str = "web"):
    res = _evaluate_query(q, lang, channel)
    intent = res["intent"]
    user_lang = res["user_lang"]
    refs = res["refs"]
    top = res["top"]
    abstained = res["abstained"]
    citations = res["citations"]

    store.log(
        ts=datetime.datetime.now().isoformat(),
        channel=channel,
        language=user_lang,
        intent=intent,
        matched_is=refs[0] if refs else None,
        top_score=top,
        abstained=1 if abstained else 0
    )

    if res["direct_answer"] is not None:
        return {
            "answer": res["direct_answer"],
            "intent": intent,
            "abstained": abstained,
            "citations": citations,
            "highlight_nodes": refs,
            "grounding": res.get("grounding", {}),
            "verification": res.get("verification"),
            "passport_url": res["passport_url"],
            "passport_product": res.get("passport_product", res["query_en"])
        }

    # Grounded Phrasing + Hallucination Enforcer
    raw_answer = answers.phrase(res["facts"], res["query_en"])
    text = guard.enforce(raw_answer, refs)

    # Translate response back to Hindi if input was vernacular
    if res["is_hi"]:
        text = lang_utils.translate(text, src="en", tgt="hi")

    return {
        "answer": text,
        "intent": intent,
        "abstained": False,
        "citations": citations,
        "highlight_nodes": refs,
        "grounding": res.get("grounding", {}),
        "passport_url": res["passport_url"],
        "passport_product": res.get("passport_product", res["query_en"])
    }


def _chat_event_generator(q: str, lang: str = "en", channel: str = "web"):
    res = _evaluate_query(q, lang, channel)
    intent = res["intent"]
    user_lang = res["user_lang"]
    refs = res["refs"]
    top = res["top"]
    abstained = res["abstained"]
    citations = res["citations"]
    passport_url = res["passport_url"]

    store.log(
        ts=datetime.datetime.now().isoformat(),
        channel=channel,
        language=user_lang,
        intent=intent,
        matched_is=refs[0] if refs else None,
        top_score=top,
        abstained=1 if abstained else 0
    )

    if res["direct_answer"] is not None:
        for word in res["direct_answer"].split(" "):
            yield f"data: {json.dumps({'t': word + ' '})}\n\n"
    else:
        for chunk in answers.phrase_stream(res["facts"], res["query_en"], lang="hi" if res["is_hi"] else "en"):
            yield f"data: {json.dumps({'t': chunk})}\n\n"

    meta_payload = {
        "citations": citations,
        "abstained": abstained,
        "intent": intent,
        "highlight_nodes": refs,
        "passport_url": passport_url,
        "passport_product": res.get("passport_product", res["query_en"]),
        "verification": res.get("verification"),
        "grounding": res.get("grounding", {})
    }
    yield f"event: meta\ndata: {json.dumps(meta_payload)}\n\n"
    yield "event: done\ndata: {}\n\n"


@app.api_route("/chat/stream", methods=["GET", "POST"])
def chat_stream(q: str, lang: str = "en", channel: str = "web"):
    return StreamingResponse(
        _chat_event_generator(q, lang, channel),
        media_type="text/event-stream"
    )


@app.post("/verify/mark")
async def verify_mark_endpoint(
    code: Optional[str] = Form(None),
    mark_type: Optional[str] = Form("auto"),
    purity: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    """
    Dedicated endpoint for validating HUID, ISI, and CRS marks from text or uploaded image.
    """
    if file:
        content = await file.read()
        return marks.extract_mark_from_image(content, expected_type=mark_type or "auto", purity=purity)

    if code:
        return marks.verify_mark(code=code, mark_type=mark_type or "auto", purity=purity)

    return {
        "valid": False,
        "reason": "Please provide either a mark code string or an image file to verify.",
        "citations": []
    }


@app.get("/api/schemes")
def get_schemes():
    return answers.scheme_catalog()


# ── Graph endpoints ───────────────────────────────────────────────────────────
@app.get("/graph")
def get_graph(highlight: str = "", full: bool = False):
    try:
        from api import graph_queries
        center = f"std:{highlight}" if highlight else None
        data = graph_queries.subgraph_json(center_node=center, full=full, connected_only=not full)
        data["highlight_nodes"] = [highlight] if highlight else []
        return data
    except Exception:
        nodes = [highlight] if highlight else None
        return answers.graph(highlight=nodes)


@app.get("/graph/lab/{lab_id}")
def lab_detail(lab_id: str):
    try:
        from api import graph_queries
        return graph_queries.lab_scope(lab_id)
    except FileNotFoundError:
        return {"error": "Graph not built yet. Run: python api/graph_build.py"}


@app.get("/graph/related/{is_number:path}")
def related(is_number: str):
    try:
        from api import graph_queries
        return {"related": graph_queries.related_standards(is_number)}
    except FileNotFoundError:
        return {"error": "Graph not built yet."}


@app.get("/graph/ics/{ics_code}")
def ics_chain(ics_code: str):
    try:
        from api import graph_queries
        return {"chain": graph_queries.ics_ancestors(ics_code)}
    except FileNotFoundError:
        return {"error": "Graph not built yet."}


@app.get("/graph/product/{product:path}")
def product_path(product: str):
    try:
        from api import graph_queries
        return {"paths": graph_queries.product_to_lab_path(product)}
    except FileNotFoundError:
        return {"error": "Graph not built yet."}


# ── Lab endpoints ─────────────────────────────────────────────────────────────
@app.get("/labs/near")
def get_labs_near(product: str = "", city: str = "", category: str = "", is_number: str = "", limit: int = 50):
    return answers.labs(
        product=product or None,
        city=city or None,
        category=category or None,
        is_number=is_number or None,
        limit=limit
    )


@app.get("/api/labs")
def get_lab_catalog(query: str = "", city: str = "", category: str = "", limit: int = 24):
    return store.lab_catalog(query=query, city=city, category=category, limit=limit)


# ── Passport endpoints ────────────────────────────────────────────────────────
@app.get("/api/passport/{product:path}")
def api_passport(product: str, candidate_id: Optional[int] = None, city: str = ""):
    return answers.passport(product, candidate_id=candidate_id, city=city)


@app.get("/passport/{product:path}")
def view_passport(product: str):
    data = answers.passport(product)
    html = f"""
    <html>
    <head><title>Compliance Passport: {product}</title></head>
    <body style="font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px;">
        <h1>Compliance Passport: {product}</h1>
        <button onclick="window.print()" style="margin-bottom: 20px; padding: 10px; cursor: pointer;">Print Dossier</button>
        <div style="background: #f4f4f4; padding: 15px; border-radius: 8px;">
            <pre style="white-space: pre-wrap;">{data}</pre>
        </div>
    </body>
    </html>
    """
    return HTMLResponse(html)


@app.get("/stats")
def stats():
    return store.get_stats()


# ── Web Search endpoint (Exa) ─────────────────────────────────────────────────
@app.get("/search/web")
def search_web(q: str, n: int = 3):
    """
    Direct Exa neural web search scoped to BIS-authoritative domains.
    Returns live results from bis.gov.in, egazette.gov.in, standardsbis.in, etc.

    Query params:
        q  — search query (any language)
        n  — number of results (default: 3, max: 10)
    """
    try:
        from api import web_search as ws
    except ImportError:
        try:
            import web_search as ws  # type: ignore
        except ImportError:
            return {"results": [], "error": "web_search module not available"}

    import os
    if not os.environ.get("EXA_API_KEY"):
        return {
            "results": [],
            "warning": "EXA_API_KEY not set. Add it to .env to enable web search."
        }

    hits = ws.exa_search(q, num_results=min(n, 10))
    return {
        "query": q,
        "results": hits,
        "count": len(hits),
        "source": "exa.ai"
    }


@app.get("/api/analytics")
def analytics():
    return store.analytics()
