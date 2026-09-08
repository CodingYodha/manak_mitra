from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from api import answers, guard, store
import datetime
import re

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def route(q: str) -> str:
    ql = q.lower()
    if re.search(r"\b(passport|dossier|compliance report|पासपोर्ट)\b", ql):
        return "passport"
    if re.search(r"\b(mandatory|compulsory|do i need|require|अनिवार्य|ज़रूरी|qco)\b", ql):
        return "mandate"
    if re.search(r"\b(scheme|crs|isi|hallmark|fmcs|process|fees|steps|प्रक्रिया|शुल्क)\b", ql):
        return "scheme"
    if re.search(r"\b(lab|testing|where to test|प्रयोगशाला|टेस्टिंग)\b", ql):
        return "labs"
    if re.search(r"\b(fake|huid|verify mark|हॉलमार्क|जांच)\b", ql):
        return "consumer"
    return "recommend"

@app.on_event("startup")
def on_startup():
    store.init()

@app.post("/chat")
def chat(q: str, lang: str = "en", channel: str = "web"):
    intent = route(q)
    
    # Map intents to answer functions
    if intent == "mandate":
        facts = answers.mandate(q)
    elif intent == "scheme":
        # Simplified: defaults to CRS for demo. A real app would extract the scheme name.
        facts = {"data": answers.scheme("CRS"), "citations": []}
    elif intent == "labs":
        facts = {"data": answers.labs(category=q), "citations": []}
    elif intent == "passport":
        facts = {"data": answers.passport(q), "citations": []}
    else:
        facts = answers.recommend(q)
        
    hits = facts.get("hits", [])
    top = hits[0]["score"] if hits else (1.0 if facts.get("citations") else 0.0)

    if guard.should_abstain(top):
        store.log(ts=datetime.datetime.now().isoformat(), channel=channel, language=lang,
                  intent=intent, matched_is=None, top_score=top, abstained=1)
        return {"answer": guard.REFUSAL, "abstained": True, "citations": []}

    citations = facts.get("citations", [])
    refs = [c["ref"] for c in citations]
    
    text = guard.enforce(answers.phrase(facts, q), refs)
    store.log(ts=datetime.datetime.now().isoformat(), channel=channel, language=lang,
              intent=intent, matched_is=refs[0] if refs else None,
              top_score=top, abstained=0)
              
    return {
        "answer": text, 
        "intent": intent,
        "abstained": False,
        "citations": citations,
        "highlight_nodes": refs,
        "passport_url": f"/passport/{q}" if intent in ["mandate", "recommend", "passport"] else ""
    }

@app.get("/graph")
def get_graph():
    return answers.graph()

@app.get("/labs/near")
def get_labs(city: str = "", category: str = ""):
    return answers.labs(city, category)

@app.get("/api/passport/{product}")
def api_passport(product: str):
    return answers.passport(product)

@app.get("/passport/{product}")
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
