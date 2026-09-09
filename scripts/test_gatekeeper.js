const { classifyAndReplyCasual } = require("../whatsapp");

async function runTests() {
  const testCases = [
    { query: "hii", expected: "casual" },
    { query: "what can you do", expected: "casual" },
    { query: "asdkjhasd", expected: "gibberish" },
    { query: "123891723", expected: "gibberish" },
    { query: "Is BIS certification mandatory for 9W LED bulb?", expected: "compliance" },
    { query: "IS 16102 standard", expected: "compliance" }
  ];

  console.log("==================================================");
  console.log(" Running Gatekeeper Tests with Groq LLM Classifier");
  console.log("==================================================\n");

  let passed = 0;

  for (const tc of testCases) {
    const start = Date.now();
    const reply = await classifyAndReplyCasual(tc.query);
    const elapsed = Date.now() - start;

    let resultCategory = "unknown";
    if (reply === null) {
      resultCategory = "compliance";
    } else {
      const norm = reply.replace(/[\s\u202f\u00a0]+/g, " ").toLowerCase();
      if (norm.includes("didn't quite catch") || norm.includes("did not understand") || norm.includes("didn't understand") || norm.includes("didn't catch")) {
        resultCategory = "gibberish";
      } else if (norm.includes("manak mitra") || reply.includes("मानक मित्र") || norm.includes("compliance assistant")) {
        resultCategory = "casual";
      }
    }

    const ok = (tc.expected === "compliance" && reply === null) ||
               (tc.expected === "gibberish" && reply !== null && (resultCategory === "gibberish" || reply.toLowerCase().includes("catch"))) ||
               (tc.expected === "casual" && reply !== null && resultCategory === "casual");

    if (ok) passed++;

    console.log(`[${ok ? "PASS" : "FAIL"}] Query: "${tc.query}"`);
    console.log(`       Expected: ${tc.expected}, Detected: ${resultCategory} (${elapsed}ms)`);
    if (reply) {
      const preview = reply.replace(/\n/g, " ").slice(0, 100);
      console.log(`       Preview: "${preview}..."`);
    } else {
      console.log(`       Routed: -> Passed to Standards RAG Engine`);
    }
    console.log("");
  }

  console.log(`Total: ${passed}/${testCases.length} tests passed.`);
  process.exit(passed === testCases.length ? 0 : 1);
}

runTests().catch(err => {
  console.error("Test error:", err);
  process.exit(1);
});
