// Read the implementation address from the proxy contract's EIP-1967 storage slot
const PROXY_ADDRESS = "0x167ad284c7bcc4d6342991aa258422e7a04f926e";
// EIP-1967 implementation slot: bytes32(uint256(keccak256('eip1967.proxy.implementation')) - 1)
const IMPLEMENTATION_SLOT = "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

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

// Now let's also try to read the contract interface via eth_call
// Let's try calling some known function selectors to see what's available
// First, let's check if the implementation contract has source code on bscscan
console.log(`\nCheck implementation at: https://bscscan.com/address/${implAddress}#code`);

// Let's try to read function selectors by calling the contract
// Try makeCrime with no args to see if it exists
const selectors = [
  { name: "makeCrime(uint256)", selector: "0x" },
];

// Let's just get the bytecode of the implementation to check its size
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
