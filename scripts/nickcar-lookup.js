// Look up "nickCar" signature specifically via 4byte
async function main() {
  // Search by text name
  const res = await fetch("https://www.4byte.directory/api/v1/signatures/?text_signature=nickCar");
  const data = await res.json();
  console.log("4byte results for 'nickCar':", JSON.stringify(data.results, null, 2));

  // Also try openchain
  try {
    // Common variations
    const sigs = ["nickCar()", "nickCar(uint256)", "nickCar(uint8)", "nickCar(address)"];
    for (const sig of sigs) {
      const encoder = new TextEncoder();
      const msgBuffer = encoder.encode(sig);
      const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
      // keccak not available natively, let's just check 4byte for text search
    }
  } catch(e) {}

  // Try broader search
  const res2 = await fetch("https://www.4byte.directory/api/v1/signatures/?text_signature__contains=nickCar");
  const data2 = await res2.json();
  console.log("4byte broad results:", JSON.stringify(data2.results, null, 2));

  // Also check the proxy for implementation and get first few selectors only
  const RPC = "https://bsc-dataseed1.binance.org";
  const PROXY = "0x60b8e0dd9566b42f9caa5538350aa0d29988373c";
  const IMPL_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";
  
  const rpcRes = await fetch(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getStorageAt", params: [PROXY, IMPL_SLOT, "latest"] }),
  });
  const rpcData = await rpcRes.json();
  const implAddr = "0x" + rpcData.result.slice(26);
  console.log("Implementation:", implAddr);
}
main().catch(console.error);
