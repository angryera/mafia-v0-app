// Read the implementation address from the proxy contract's EIP-1967 storage slot
const PROXY_ADDRESS = "0x167ad284c7bcc4d6342991aa258422e7a04f926e";
// EIP-1967 implementation slot
const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

async function main() {
  const response = await fetch("https://bsc-dataseed.binance.org/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getStorageAt",
      params: [PROXY_ADDRESS, IMPLEMENTATION_SLOT, "latest"],
      id: 1,
    }),
  });

  const data = await response.json();
  console.log("Raw storage value:", data.result);

  // Extract address from the 32-byte storage value
  const implAddress = "0x" + data.result.slice(26);
  console.log("Implementation address:", implAddress);
  console.log("Check at: https://bscscan.com/address/" + implAddress + "#code");

  // Get bytecode size to confirm it's a valid contract
  const bytecodeResponse = await fetch("https://bsc-dataseed.binance.org/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getCode",
      params: [implAddress, "latest"],
      id: 2,
    }),
  });

  const bytecodeData = await bytecodeResponse.json();
  console.log("Implementation bytecode length:", bytecodeData.result?.length || 0, "chars");
}

main().catch(console.error);
