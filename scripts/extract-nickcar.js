const RPC = "https://bsc-dataseed1.binance.org";
const PROXY = "0x60b8e0dd9566b42f9caa5538350aa0d29988373c";
const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

async function rpc(method, params) {
  const res = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const j = await res.json();
  return j.result;
}

async function main() {
  // Try reading implementation slot (proxy)
  const implSlot = await rpc("eth_getStorageAt", [PROXY, IMPL_SLOT, "latest"]);
  const implAddr = implSlot && implSlot !== "0x0000000000000000000000000000000000000000000000000000000000000000"
    ? "0x" + implSlot.slice(26)
    : null;

  const target = implAddr || PROXY;
  console.log("Target contract:", target);

  const code = await rpc("eth_getCode", [target, "latest"]);
  console.log("Bytecode length:", code.length);

  // Extract 4-byte selectors from PUSH4 opcodes (0x63)
  const selectors = new Set();
  for (let i = 2; i < code.length - 8; i += 2) {
    if (code.slice(i, i + 2) === "63") {
      selectors.add("0x" + code.slice(i + 2, i + 10));
    }
  }

  console.log("Found", selectors.size, "potential selectors");

  // Look up via 4byte.directory
  const selectorArr = [...selectors];
  for (const sel of selectorArr) {
    try {
      const res = await fetch(`https://www.4byte.directory/api/v1/signatures/?hex_signature=${sel}`);
      const data = await res.json();
      if (data.results && data.results.length > 0) {
        const names = data.results.map(r => r.text_signature).join(", ");
        console.log(`${sel} => ${names}`);
      }
      // Rate limit
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      // try openchain as fallback
      try {
        const res2 = await fetch(`https://api.openchain.xyz/signature-database/v1/lookup?function=${sel}`);
        const data2 = await res2.json();
        if (data2.result?.function?.[sel]) {
          const names = data2.result.function[sel].map(r => r.name).join(", ");
          console.log(`${sel} => ${names}`);
        }
      } catch (e2) {
        console.log(`${sel} => lookup failed`);
      }
    }
  }
}

main().catch(console.error);
