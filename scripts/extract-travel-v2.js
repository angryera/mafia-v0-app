// Extract selectors and try 4byte.directory API
const RPC = "https://bsc-dataseed1.binance.org";

async function main() {
  // Implementation address from previous script
  const implAddr = "0x2a4d56a74b0ba2422e2ad19d71fba7f2b0f394bf";

  // Get bytecode
  const codeRes = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getCode",
      params: [implAddr, "latest"],
    }),
  });
  const codeData = await codeRes.json();
  const bytecode = codeData.result;

  // Extract 4-byte selectors from PUSH4 opcodes (0x63)
  const selectors = new Set();
  const hex = bytecode.slice(2);
  for (let i = 0; i < hex.length - 8; i += 2) {
    if (hex.slice(i, i + 2) === "63") {
      const selector = "0x" + hex.slice(i + 2, i + 10);
      if (/^0x[0-9a-f]{8}$/.test(selector)) {
        selectors.add(selector);
      }
    }
  }

  console.log(`Found ${selectors.size} selectors`);

  // Look up each selector individually via 4byte.directory
  const resolved = [];
  const selectorArray = Array.from(selectors);
  
  for (let i = 0; i < selectorArray.length; i += 5) {
    const batch = selectorArray.slice(i, i + 5);
    const promises = batch.map(async (sel) => {
      try {
        const res = await fetch(
          `https://www.4byte.directory/api/v1/signatures/?hex_signature=${sel}`,
          { headers: { Accept: "application/json" } }
        );
        const data = await res.json();
        if (data.results && data.results.length > 0) {
          for (const r of data.results) {
            resolved.push({ selector: sel, signature: r.text_signature });
          }
        }
      } catch (e) {
        // skip
      }
    });
    await Promise.all(promises);
    // Small delay to be nice to the API
    await new Promise((r) => setTimeout(r, 200));
  }

  console.log("\n=== ALL RESOLVED FUNCTIONS ===");
  const sorted = resolved.sort((a, b) => a.signature.localeCompare(b.signature));
  for (const r of sorted) {
    console.log(`${r.selector} => ${r.signature}`);
  }

  console.log("\n=== TRAVEL-RELATED FUNCTIONS ===");
  const travelFns = resolved.filter((r) =>
    r.signature.toLowerCase().includes("travel")
  );
  for (const r of travelFns) {
    console.log(`${r.selector} => ${r.signature}`);
  }

  console.log("\n=== WRITE FUNCTIONS (no view/pure) ===");
  // Show all unique function names
  const uniqueNames = [...new Set(resolved.map((r) => r.signature))];
  for (const name of uniqueNames.sort()) {
    console.log(name);
  }
}

main().catch(console.error);
