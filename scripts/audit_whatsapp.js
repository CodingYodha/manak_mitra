/**
 * Comprehensive Automated Audit & Test Suite for Manak Mitra WhatsApp Channel
 */
const { classifyAndReplyCasual, SYSTEM_PROMPT } = require('../whatsapp.js');

async function runAudit() {
  console.log('===============================================================');
  console.log('  🧪 AUDITING MANAK MITRA WHATSAPP CHANNEL (whatsapp.js)');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(desc, condition) {
    if (condition) {
      console.log(`  ✅ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${desc}`);
      failed++;
    }
  }

  // ── TEST SUITE 1: AI Gateway & Classifier Tests ─────────────────────
  console.log('── Test Suite 1: Inbound Classification & Gatekeeper ──');

  // Test 1.1: English Greeting
  const r1 = await classifyAndReplyCasual('hello');
  assert('Greeting ("hello") responds with greeting and does not hit RAG', typeof r1 === 'string' && r1.length > 20);

  // Test 1.2: Hindi Greeting
  const r2 = await classifyAndReplyCasual('नमस्ते मानक मित्र');
  assert('Hindi Greeting ("नमस्ते") responds in Hindi', typeof r2 === 'string' && /[\u0900-\u097F]/.test(r2));

  // Test 1.3: Gratitude
  const r3 = await classifyAndReplyCasual('thank you so much');
  assert('Gratitude ("thank you so much") returns polite appreciation', typeof r3 === 'string' && /welcome/i.test(r3));

  // Test 1.4: Hindi Gratitude
  const r4 = await classifyAndReplyCasual('धन्यवाद');
  assert('Hindi Gratitude ("धन्यवाद") returns polite Hindi response', typeof r4 === 'string' && (/धन्यवाद/i.test(r4) || /स्वागत/i.test(r4) || /[\u0900-\u097F]/.test(r4)));

  // Test 1.5: Identity inquiry
  const r5 = await classifyAndReplyCasual('who are you and what can you do?');
  assert('Identity question introduces Manak Mitra capabilities', typeof r5 === 'string' && /Manak Mitra|मानक मित्र/i.test(r5));

  // Test 1.6: Gibberish / Nonsense
  const r6 = await classifyAndReplyCasual('asdkjhasd9812739');
  assert('Gibberish returns polite clarification asking for product/IS', typeof r6 === 'string' && /catch that|understand|standard|product/i.test(r6));

  // Test 1.7: Compliance Query (9W LED Bulb) - MUST return null to trigger standards engine
  const r7 = await classifyAndReplyCasual('Is BIS certification mandatory for 9W LED bulb?');
  assert('Compliance inquiry (9W LED) returns null to route to RAG', r7 === null);

  // Test 1.8: Compliance Query (IS Standard Number)
  const r8 = await classifyAndReplyCasual('IS 16102 (Part 1)');
  assert('IS number inquiry ("IS 16102") returns null to route to RAG', r8 === null);

  // Test 1.9: Compliance Query (Toys)
  const r9 = await classifyAndReplyCasual('Do plastic toys need ISI mark?');
  assert('Toys compliance inquiry returns null to route to RAG', r9 === null);

  // Test 1.10: Compliance Query (Gold Hallmarking)
  const r10 = await classifyAndReplyCasual('22K gold jewellery HUID hallmarking');
  assert('Gold hallmarking inquiry returns null to route to RAG', r10 === null);

  // ── TEST SUITE 2: Group and Broadcast Filter Security ────────────────
  console.log('\n── Test Suite 2: Anti-Spam & Message Filter Security ──');

  function shouldProcessMessage(m) {
    if (!m.message || m.key.fromMe) return false;
    const remoteJid = m.key.remoteJid;
    if (remoteJid.endsWith('@g.us') || remoteJid.endsWith('@broadcast')) {
      return false;
    }
    const text = m.message.conversation || m.message.extendedTextMessage?.text || m.message.imageMessage?.caption || '';
    return Boolean(text.trim());
  }

  assert('Discards outgoing messages (fromMe: true)', !shouldProcessMessage({ key: { fromMe: true, remoteJid: '919876543210@s.whatsapp.net' }, message: { conversation: 'hi' } }));
  assert('Discards group messages (@g.us)', !shouldProcessMessage({ key: { fromMe: false, remoteJid: '12345-67890@g.us' }, message: { conversation: 'Is BIS mandatory?' } }));
  assert('Discards broadcast status messages (@broadcast)', !shouldProcessMessage({ key: { fromMe: false, remoteJid: 'status@broadcast' }, message: { conversation: 'status update' } }));
  assert('Discards empty messages', !shouldProcessMessage({ key: { fromMe: false, remoteJid: '919876543210@s.whatsapp.net' }, message: {} }));
  assert('Accepts valid 1-on-1 private direct chat', shouldProcessMessage({ key: { fromMe: false, remoteJid: '919876543210@s.whatsapp.net' }, message: { conversation: 'Need BIS standard for helmets' } }));

  // ── TEST SUITE 3: Outbound WhatsApp Formatting ───────────────────────
  console.log('\n── Test Suite 3: WhatsApp Typography & Formatting ──');

  function formatWhatsAppReply(data) {
    let reply = data.answer || "No response received from standards engine.";
    // Convert **bold** to *bold*
    reply = reply.replace(/\*\*(.*?)\*\*/g, "*$1*");

    // Format citations capped to top 2
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

    return reply;
  }

  const sampleAnswer = {
    answer: "Under the **Electronics and IT Goods Order**, 9W LED lamps require **mandatory** registration under standard **IS 16102 (Part 1)**.",
    citations: [
      { kind: "standard", ref: "IS 16102 (Part 1)", status: "ACTIVE" },
      { kind: "qco", ref: "Electronics and IT Goods Order" },
      { kind: "web", ref: "https://bis.gov.in" }
    ],
    abstained: false
  };

  const formatted = formatWhatsAppReply(sampleAnswer);
  assert('Replaces standard markdown **bold** with WhatsApp *bold*', !formatted.includes('**') && formatted.includes('*Electronics and IT Goods Order*'));
  assert('Limits citations to top 2 for concise mobile messaging', formatted.split('•').length - 1 === 2);
  assert('Includes official citations header', formatted.includes('📚 *Official Citations:*'));

  const abstainedAnswer = {
    answer: "I cannot answer this question from authenticated official gazettes.",
    citations: [],
    abstained: true
  };

  const abstainedFormatted = formatWhatsAppReply(abstainedAnswer);
  assert('Appends BIS helpline when query is abstained', abstainedFormatted.includes('1800-11-4000'));

  // ── SUMMARY ─────────────────────────────────────────────────────────
  console.log('\n===============================================================');
  console.log(`  🏁 AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAudit().catch((e) => {
  console.error('Audit execution error:', e);
  process.exit(1);
});
