export const erc20Abi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "allowance", stateMutability: "view", inputs: [{ name: "o", type: "address" }, { name: "s", type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ name: "s", type: "address" }, { name: "a", type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ name: "to", type: "address" }, { name: "a", type: "uint256" }], outputs: [] },
] as const;

export const tokenAbi = [
  ...erc20Abi,
  { type: "function", name: "faceValue", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "expiry", stateMutability: "view", inputs: [], outputs: [{ type: "uint64" }] },
  { type: "function", name: "timeToExpiry", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const hookAbi = [
  { type: "function", name: "currentFactorBips", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const adapterAbi = [
  { type: "function", name: "isEligible", stateMutability: "view", inputs: [{ name: "u", type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "nodeOf", stateMutability: "view", inputs: [{ name: "u", type: "address" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "bind", stateMutability: "nonpayable", inputs: [{ name: "user", type: "address" }, { name: "node", type: "bytes32" }], outputs: [] },
] as const;

export const resolverAbi = [
  { type: "function", name: "text", stateMutability: "view", inputs: [{ name: "node", type: "bytes32" }, { name: "key", type: "string" }], outputs: [{ type: "string" }] },
  { type: "function", name: "onboard", stateMutability: "nonpayable", inputs: [{ name: "node", type: "bytes32" }, { name: "provider", type: "string" }, { name: "verified", type: "string" }, { name: "expires", type: "uint64" }], outputs: [] },
  { type: "function", name: "setStatus", stateMutability: "nonpayable", inputs: [{ name: "node", type: "bytes32" }, { name: "status", type: "string" }], outputs: [] },
] as const;

const poolKeyTuple = {
  type: "tuple",
  components: [
    { name: "currency0", type: "address" },
    { name: "currency1", type: "address" },
    { name: "fee", type: "uint24" },
    { name: "tickSpacing", type: "int24" },
    { name: "hooks", type: "address" },
  ],
} as const;

const swapParamsTuple = {
  type: "tuple",
  components: [
    { name: "zeroForOne", type: "bool" },
    { name: "amountSpecified", type: "int256" },
    { name: "sqrtPriceLimitX96", type: "uint160" },
  ],
} as const;

export const routerAbi = [
  {
    type: "function",
    name: "swap",
    stateMutability: "nonpayable",
    inputs: [poolKeyTuple, swapParamsTuple],
    outputs: [{ type: "int256" }],
  },
] as const;
