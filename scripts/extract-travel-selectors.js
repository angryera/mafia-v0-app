const RPC = "https://bsc-dataseed1.binance.org";
const PROXY_ADDR = "0xa08d627e071cb4b53c6d0611d77dbcb659902aa4";

// EIP-1967 implementation slot
const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json();
  return json.result;
}

async function main() {
  // 1. Read implementation address from proxy
  const implRaw = await rpc("eth_getStorageAt", [PROXY_ADDR, IMPL_SLOT, "latest"]);
  const implAddr = "0x" + implRaw.slice(26);
  console.log("Proxy:", PROXY_ADDR);
  console.log("Implementation:", implAddr);

  // 2. Get bytecode
  const code = await rpc("eth_getCode", [implAddr, "latest"]);
  console.log("Bytecode length:", code.length);

  // 3. Extract 4-byte selectors
  const selectorSet = new Set();
  const hex = code.slice(2);
  // Look for PUSH4 (0x63) instructions
  for (let i = 0; i < hex.length - 10; i += 2) {
    if (hex.slice(i, i + 2) === "63") {
      const sel = "0x" + hex.slice(i + 2, i + 10);
      if (sel !== "0xffffffff" && sel !== "0x00000000") {
        selectorSet.add(sel);
      }
    }
  }

  const selectors = Array.from(selectorSet);
  console.log(`Found ${selectors.length} potential selectors`);

  // 4. Look up selectors via openchain
  const batchSize = 50;
  const allResults = [];

  for (let i = 0; i < selectors.length; i += batchSize) {
    const batch = selectors.slice(i, i + batchSize);
    const query = batch.map((s) => `function=${s}`).join("&");
    const url = `https://api.openchain.xyz/signature-database/v1/lookup?${query}`;
    try {
      const res = await fetch(url);
      const data = await res.json();
      if (data.ok && data.result && data.result.function) {
        for (const [sel, matches] of Object.entries(data.result.function)) {
          if (matches && matches.length > 0) {
            allResults.push({ selector: sel, name: matches[0].name });
          }
        }
      }
    } catch (e) {
      console.log("Batch lookup error:", e.message);
    }
  }

  console.log("\n=== RESOLVED FUNCTIONS ===");
  for (const r of allResults.sort((a, b) => a.name.localeCompare(b.name))) {
    console.log(`${r.selector} -> ${r.name}`);
  }

  // Filter travel-related
  const travelFns = allResults.filter(
    (r) => r.name.toLowerCase().includes("travel")
  );
  console.log("\n=== TRAVEL FUNCTIONS ===");
  for (const r of travelFns) {
    console.log(`${r.selector} -> ${r.name}`);
  }
}

main().catch(console.error);
