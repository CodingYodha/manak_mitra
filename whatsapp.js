/**
 * Manak Mitra — Headless WhatsApp Transport
 * Track: Channels
 * Owner: Miya
 *
 * Runs a lightweight Baileys WhatsApp Web client.
 * Forwards received messages to the FastAPI /chat endpoint and sends back cited answers.
 *
 * Usage:
 *   node whatsapp.js
 */
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");
const qrcode = require("qrcode-terminal");

const pino = require("pino");

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

const SYSTEM_PROMPT = `You are Manak Mitra (मानक मित्र), the official AI Compliance Assistant for Bureau of Indian Standards (BIS), Ministry of Consumer Affairs, Government of India.

Your capabilities:
1. Quality Control Orders (QCOs): Confirm if products (LED bulbs, toys, steel, helmets, gold, cement, etc.) need mandatory BIS certification.
2. Indian Standards (IS): Identify applicable standards (e.g. IS 16102 for LED bulbs, IS 9873 for toys, IS 1417 for gold).
3. BIS Testing Laboratories: Search across 340+ accredited test facilities and 6 Apex Testing Hubs across India.
4. Certification Schemes & Fees: Guide manufacturers on ISI Mark Scheme-I, CRS, FMCS, and Hallmarking processes.
5. Consumer Mark Verification: Validate 6-digit HUID gold hallmarks and CM/L license numbers.

Task:
Determine if the user query is:
A) CASUAL: Greeting, pleasantry, identity question ("who are you", "what can you do"), gratitude ("thanks"), or general casual chat (e.g., "hi", "hii", "hello", "hey", "namaste", "good morning", "how are you", "help").
B) COMPLIANCE: A specific compliance, product, standard, testing lab, license, or technical question.

If CASUAL:
Generate a warm, friendly, concise, and helpful response in the user's language (English or Hindi).
Introduce yourself as Manak Mitra (मानक मित्र), the official BIS Assistant, and briefly summarize how you can help them with standards, QCOs, labs, and certification. Do NOT cite standard numbers or include citations.

If COMPLIANCE:
Return the exact keyword: [COMPLIANCE_QUERY]`;

async function classifyAndReplyCasual(query) {
  const ql = query.toLowerCase().trim();
  const isHindi = /[\u0900-\u097F]/.test(query);

  // 1. Try Cloud LLM (Groq / Gemini) if API keys are available
  if (process.env.GROQ_API_KEY) {
    try {
      const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.1-8b-instant",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: query }
          ],
          temperature: 0.3,
          max_tokens: 250
        })
      });
      if (resp.ok) {
        const data = await resp.json();
        const content = data.choices?.[0]?.message?.content?.trim() || "";
        if (content.includes("[COMPLIANCE_QUERY]")) {
          return null; // Route to RAG backend
        }
        return content;
      }
    } catch (e) {
      console.warn("[WhatsApp AI] Groq classification failed, using built-in classifier:", e.message);
    }
  }

  // 2. High-Fidelity Built-in Conversational Classification Engine
  const greetingPattern = /^\s*(hi|hello|hey|hii+|heyy+|namaste|नमस्ते|नमस्कार|सुप्रभात|halo|hoi|yo)(\s+|$|[!.,?])/i;
  const identityPattern = /^\s*(who are you|who is manak mitra|what is manak mitra|what are you|what can you do|help|commands|features|options|tell me about yourself|about you|आप कौन हैं|क्या कर सकते हैं)(\s+|$|[!.,?])/i;
  const gratitudePattern = /^\s*(thanks|thank you|thx|धन्यवाद|शुक्रिया)(\s+|$|[!.,?])/i;
  const pleasantryPattern = /^\s*(how are you|kaise ho|kya haal|good morning|good evening|good afternoon)(\s+|$|[!.,?])/i;

  if (greetingPattern.test(ql) || identityPattern.test(ql) || pleasantryPattern.test(ql) || ql.length <= 4) {
    // If it's not mentioning a known product or standard
    const hasProduct = /(led|bulb|toy|gold|cement|steel|helmet|cable|wire|battery|water|lab|huid|qco|isi|crs|fmcs|is\s*\d+)/i.test(ql);
    if (!hasProduct) {
      if (isHindi) {
        return "नमस्ते! 🙏 मैं *मानक मित्र (Manak Mitra)* हूँ — भारतीय मानक ब्यूरो (BIS) का आधिकारिक AI अनुपालन सहायक।\n\nमैं आपकी इन विषयों में सहायता कर सकता हूँ:\n• *अनिवार्य QCOs*: जांचें कि क्या आपके उत्पाद पर सरकारी गुणवत्ता नियंत्रण आदेश लागू है\n• *भारतीय मानक*: 23,500+ भारतीय मानक (IS Numbers जैसे LED के लिए IS 16102)\n• *परीक्षण प्रयोगशालाएं*: देश भर की 340+ मान्यता प्राप्त लैब्स खोजें\n• *प्रमाणीकरण योजनाएं*: ISI मार्क, CRS, FMCS प्रक्रियाएं एवं सरकारी शुल्क\n• *हॉलमार्क सत्यापन*: 6-अंकीय HUID एवं CM/L लाइसेंस जांच\n\nआज मैं आपकी क्या सहायता कर सकता हूँ?";
      }
      return "Namaste! 🙏 I am *Manak Mitra (मानक मित्र)*, your official AI Compliance Assistant for the Bureau of Indian Standards (BIS), Government of India.\n\nHere is how I can assist you:\n• *Mandatory QCOs*: Check if your product requires compulsory BIS certification\n• *Indian Standards*: Find verified Indian Standards (e.g., IS 16102 for LED bulbs, IS 9873 for toys)\n• *Testing Labs*: Locate accredited testing facilities across 340+ laboratories in India\n• *Certification Schemes*: Step-by-step guidance on ISI Mark, CRS, and FMCS fees & procedures\n• *Mark Verification*: Validate 6-digit HUID gold hallmarks and CM/L license numbers\n\nHow can I help with your compliance today?";
    }
  }

  if (gratitudePattern.test(ql)) {
    if (isHindi) {
      return "आपका बहुत-बहुत धन्यवाद! 🙏 यदि आपके पास भारतीय मानकों (BIS), प्रयोगशालाओं या प्रमाणन से संबंधित कोई अन्य प्रश्न है, तो बेझिझक पूछें।";
    }
    return "You're very welcome! 🙏 Always glad to assist with official BIS standards and compliance. Let me know if you need to check any other product or laboratory!";
  }

  return null; // Route to RAG backend for standards retrieval
}

async function startWhatsAppBot() {
  console.log("[WhatsApp] Initializing session...");
  const { state, saveCreds } = await useMultiFileAuthState("wa-session");
  const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1015901307], isLatest: false }));

  console.log(`[WhatsApp] Using Baileys version: ${version.join(".")}, isLatest: ${isLatest}`);

  const sock = makeWASocket({
    version,
    auth: state,
    printQRInTerminal: false, // handled manually via qrcode-terminal
    logger: pino({ level: "silent" })
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("\n=======================================================");
      console.log(" 📱 MANAK MITRA WHATSAPP QR CODE — SCAN ON YOUR PHONE");
      console.log("=======================================================\n");
      qrcode.generate(qr, { small: true });
      console.log("\n[WhatsApp] Scan the QR code above with WhatsApp -> Linked Devices\n");
    }

    if (connection === "close") {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`[WhatsApp] Connection closed (status: ${statusCode}). Reconnecting: ${shouldReconnect}`);
      if (shouldReconnect) {
        setTimeout(startWhatsAppBot, 3000);
      } else {
        console.log("[WhatsApp] Logged out. Please delete the 'wa-session' folder to re-scan.");
      }
    } else if (connection === "open") {
      console.log("\n✅ [WhatsApp] Connected successfully! Bot is now active and listening.\n");
    }
  });

  sock.ev.on("messages.upsert", async ({ messages, type }) => {
    if (type !== "notify") return;

    for (const m of messages) {
      if (!m.message || m.key.fromMe) continue;

      const remoteJid = m.key.remoteJid;

      // 🛡️ Filter: Discard group chats (@g.us) and status broadcasts (@broadcast)
      if (remoteJid.endsWith("@g.us") || remoteJid.endsWith("@broadcast")) {
        console.log(`[WhatsApp] Ignoring group/broadcast message from ${remoteJid}`);
        continue;
      }

      // Extract text content from normal conversation or extended message
      const text =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        m.message.imageMessage?.caption ||
        "";

      const query = text.trim();
      if (!query) continue;

      console.log(`[WhatsApp] Incoming 1-on-1 message from ${remoteJid}: "${query}"`);

      try {
        // 🧠 AI Pre-Backend Classification & Conversational Gateway
        const casualReply = await classifyAndReplyCasual(query);
        if (casualReply) {
          console.log(`[WhatsApp] Conversational AI layer handled query directly.`);
          await sock.sendMessage(remoteJid, { text: casualReply });
          continue;
        }

        // 🚀 Forward technical/standards queries to FastAPI RAG backend
        const chatUrl = `${BACKEND_URL}/chat?q=${encodeURIComponent(query)}&channel=whatsapp`;
        const response = await fetch(chatUrl, { method: "POST" });

        if (!response.ok) {
          throw new Error(`Backend returned HTTP ${response.status}`);
        }

        const data = await response.json();
        let reply = data.answer || "No response received from standards engine.";

        // Format citations (capped to top 2 for clean mobile display)
        if (data.citations && data.citations.length > 0) {
          reply += "\n\n📚 *Official Citations:*";
          data.citations.slice(0, 2).forEach((c) => {
            if (c.kind === "standard") {
              reply += `\n• Standard: ${c.ref} (${c.status || "ACTIVE"})`;
            } else if (c.kind === "qco") {
              reply += `\n• Gazette QCO: ${c.ref}`;
            } else {
              reply += `\n• Ref: ${c.ref}`;
            }
          });
        }

        if (data.abstained) {
          reply += "\n\n⚠️ *Need further guidance?* Call the BIS National Helpline: *1800-11-4000*";
        }

        await sock.sendMessage(remoteJid, { text: reply });
        console.log(`[WhatsApp] Sent reply to ${remoteJid}`);
      } catch (err) {
        console.error(`[WhatsApp] Failed to process message: ${err.message}`);
        await sock.sendMessage(remoteJid, {
          text: "🙏 *Manak Mitra Assistant*\n\nUnable to fetch standards right now. Please refer to official sources at https://bis.gov.in or call the BIS Helpline on *1800-11-4000*."
        });
      }
    }
  });
}

// Start bot
startWhatsAppBot().catch((err) => console.error("[WhatsApp] Startup error:", err));
