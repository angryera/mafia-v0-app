// Extract function selectors from contract bytecode and look up makeCrime signatures
const RPC = "https://bsc-dataseed1.binance.org";

async function getCode(address) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getCode",
      params: [address, "latest"],
      id: 1,
    }),
  });
  const data = await res.json();
  return data.result;
}

function extractSelectors(bytecode) {
  // Look for PUSH4 (0x63) followed by 4 bytes, which are function selectors in the dispatcher
  const selectors = new Set();
  const hex = bytecode.startsWith("0x") ? bytecode.slice(2) : bytecode;

  // Pattern: 63 XX XX XX XX (PUSH4) typically followed by EQ (14)
  for (let i = 0; i < hex.length - 10; i += 2) {
    const opcode = hex.substring(i, i + 2);
    if (opcode === "63") {
      const selector = "0x" + hex.substring(i + 2, i + 10);
      // Check if followed by EQ or DUP+EQ pattern within next few bytes
      const after = hex.substring(i + 10, i + 20);
      if (after.includes("14")) {
        selectors.add(selector);
      }
    }
  }
  return Array.from(selectors);
}

async function lookupSelector(selector) {
  try {
    const res = await fetch(
      `https://api.openchain.xyz/signature-database/v1/lookup?function=${selector}`,
      { headers: { Accept: "application/json" } }
    );
    const data = await res.json();
    if (data.result && data.result.function && data.result.function[selector]) {
      return data.result.function[selector].map((s) => s.name);
    }
  } catch (e) {
    // ignore
  }
  return [];
}

async function main() {
  // Use the implementation contract
  const implAddress = "0xe5dfa1a6d81fc03564545a5723e79f3ae03fc565";
  console.log("Fetching bytecode for implementation:", implAddress);

  const bytecode = await getCode(implAddress);
  console.log("Bytecode length:", bytecode.length);

  const selectors = extractSelectors(bytecode);
  console.log(`Found ${selectors.length} function selectors\n`);

  console.log("Looking up all selectors...\n");

  const results = [];
  // Process in batches of 10
  for (let i = 0; i < selectors.length; i += 10) {
    const batch = selectors.slice(i, i + 10);
    const promises = batch.map(async (sel) => {
      const names = await lookupSelector(sel);
      return { selector: sel, names };
    });
    const batchResults = await Promise.all(promises);
    results.push(...batchResults);
  }

  console.log("=== ALL FUNCTIONS ===");
  for (const { selector, names } of results) {
    if (names.length > 0) {
      console.log(`${selector}: ${names.join(", ")}`);
    } else {
      console.log(`${selector}: (unknown)`);
    }
  }

  console.log("\n=== makeCrime FUNCTIONS ===");
  const crimeResults = results.filter(
    (r) =>
      r.names.length > 0 &&
      r.names.some((n) => n.toLowerCase().includes("makecrime"))
  );
  if (crimeResults.length === 0) {
    console.log("No makeCrime functions found in known signatures");
  } else {
    for (const { selector, names } of crimeResults) {
      const crimeFns = names.filter((n) =>
        n.toLowerCase().includes("makecrime")
      );
      console.log(`${selector}: ${crimeFns.join(", ")}`);
    }
  }
}

main().catch(console.error);
