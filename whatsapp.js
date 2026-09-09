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
      // Extract text content from normal conversation or extended message
      const text =
        m.message.conversation ||
        m.message.extendedTextMessage?.text ||
        m.message.imageMessage?.caption ||
        "";

      const query = text.trim();
      if (!query) continue;

      console.log(`[WhatsApp] Incoming message from ${remoteJid}: "${query}"`);

      try {
        // Send query to the FastAPI /chat endpoint
        const chatUrl = `${BACKEND_URL}/chat?q=${encodeURIComponent(query)}&channel=whatsapp`;
        const response = await fetch(chatUrl, { method: "POST" });

        if (!response.ok) {
          throw new Error(`Backend returned HTTP ${response.status}`);
        }

        const data = await response.json();
        let reply = data.answer || "No response received from standards engine.";

        // Format citations if available
        if (data.citations && data.citations.length > 0) {
          reply += "\n\n📚 *Official Citations:*";
          data.citations.forEach((c) => {
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
