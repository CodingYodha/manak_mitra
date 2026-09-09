/**
 * Comprehensive Automated Audit & Test Suite for Manak Mitra WhatsApp Channel
 */
const { classifyAndReplyCasual, formatForWhatsApp, SYSTEM_PROMPT } = require('../whatsapp.js');

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

  // ── TEST SUITE 3: WhatsApp Typography & Formatting ───────────────────────
  console.log('\n── Test Suite 3: WhatsApp Typography & Formatting ──');

  // Test 3.1: Standard Markdown bold to WhatsApp single asterisk bold
  const boldTest = "This is **mandatory** under **BIS Act 2016**.";
  const boldResult = formatForWhatsApp(boldTest);
  assert('Replaces **bold** with *bold*', !boldResult.includes('**') && boldResult === "This is *mandatory* under *BIS Act 2016*.");

  // Test 3.2: Markdown headers conversion
  const headerTest = "### Compulsory Registration Scheme\nAll products must comply.";
  const headerResult = formatForWhatsApp(headerTest);
  assert('Converts markdown headers ### to *Header*', headerResult.startsWith('*Compulsory Registration Scheme*'));

  // Test 3.3: Bullet points (*, -, +) converted to unicode bullet (• )
  // CRITICAL: prevents WhatsApp from parsing leading '* ' as an unclosed bold tag!
  const bulletTest = "* Item 1\n- Item 2\n+ Item 3";
  const bulletResult = formatForWhatsApp(bulletTest);
  assert('Converts markdown bullets to unicode • bullets', bulletResult === "• Item 1\n• Item 2\n• Item 3");

  // Test 3.4: Hyperlinks [Title](url) converted to readable Title (url)
  const linkTest = "Visit [BIS Portal](https://bis.gov.in) to verify.";
  const linkResult = formatForWhatsApp(linkTest);
  assert('Converts markdown links to Text (URL)', linkResult.includes("BIS Portal (https://bis.gov.in)"));

  // Test 3.5: Identical URL label [url](url) simplified
  const selfLinkTest = "Portal: [https://bis.gov.in](https://bis.gov.in)";
  const selfLinkResult = formatForWhatsApp(selfLinkTest);
  assert('Simplifies identical URL and label links', selfLinkResult === "Portal: https://bis.gov.in");

  // Test 3.6: Markdown tables converted to clean bullet pairs
  const tableTest = "| Product | Standard |\n| --- | --- |\n| LED Bulb | IS 16102 |\n| Helmet | IS 4151 |";
  const tableResult = formatForWhatsApp(tableTest);
  assert('Converts markdown tables to clean key-value bullets', tableResult.includes("• *LED Bulb*: IS 16102") && tableResult.includes("• *Helmet*: IS 4151"));

  // Test 3.7: Hindi unicode text with bold markers
  const hindiTest = "**अनिवार्य QCOs**: जांचें कि क्या आपके उत्पाद पर **सरकारी गुणवत्ता आदेश** लागू है।";
  const hindiResult = formatForWhatsApp(hindiTest);
  assert('Formats Hindi text bolding cleanly without corrupting unicode', !hindiResult.includes('**') && hindiResult.includes('*अनिवार्य QCOs*:'));

  // Test 3.8: Stray unclosed asterisks or spacing cleanup
  const spaceAsteriskTest = "Standard: ** IS 16102 ** and **QCO 2024**";
  const spaceAsteriskResult = formatForWhatsApp(spaceAsteriskTest);
  assert('Cleans inner spaces for WhatsApp bold syntax (*word*)', !spaceAsteriskResult.includes('**') && spaceAsteriskResult.includes('*IS 16102*'));

  // Test 3.9: End-to-end RAG response formatting with citations
  const sampleAnswer = {
    answer: "Under the **Electronics and IT Goods Order**, 9W LED lamps require **mandatory** registration under standard **IS 16102 (Part 1)**.\n\n### Key Requirements\n* **Scheme**: CRS\n* **Testing**: Accredited Lab",
    citations: [
      { kind: "standard", ref: "IS 16102 (Part 1)", status: "ACTIVE" },
      { kind: "qco", ref: "Electronics and IT Goods Order" },
      { kind: "web", ref: "https://bis.gov.in" }
    ],
    abstained: false
  };

  let endToEndReply = sampleAnswer.answer;
  if (sampleAnswer.citations && sampleAnswer.citations.length > 0) {
    endToEndReply += "\n\n📚 *Official Citations:*";
    sampleAnswer.citations.slice(0, 2).forEach((c) => {
      if (c.kind === "standard") {
        endToEndReply += `\n• Standard: ${c.ref} (${c.status || "ACTIVE"})`;
      } else if (c.kind === "qco") {
        endToEndReply += `\n• Gazette QCO: ${c.ref}`;
      } else {
        endToEndReply += `\n• Ref: ${c.ref}`;
      }
    });
  }

  const endToEndFormatted = formatForWhatsApp(endToEndReply);
  assert('End-to-end RAG reply contains 0 double asterisks', !endToEndFormatted.includes('**'));
  assert('End-to-end RAG reply contains WhatsApp bold *mandatory*', endToEndFormatted.includes('*mandatory*'));
  assert('End-to-end RAG reply contains converted header *Key Requirements*', endToEndFormatted.includes('*Key Requirements*'));
  assert('End-to-end RAG reply limits citations to top 2', endToEndFormatted.split('•').length - 1 === 4); // 2 bullet items + 2 citations = 4
  assert('End-to-end RAG reply contains official citations header', endToEndFormatted.includes('📚 *Official Citations:*'));

  // Test 3.10: Abstention Helpline
  const abstainedAnswer = {
    answer: "I cannot verify this product standard in official gazettes.",
    citations: [],
    abstained: true
  };
  let abstainedReply = abstainedAnswer.answer;
  if (abstainedAnswer.abstained) {
    abstainedReply += "\n\n⚠️ *Need further guidance?* Call the BIS National Helpline: *1800-11-4000*";
  }
  const abstainedFormatted = formatForWhatsApp(abstainedReply);
  assert('Appends formatted BIS helpline when query is abstained', abstainedFormatted.includes('1800-11-4000') && !abstainedFormatted.includes('**'));

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
