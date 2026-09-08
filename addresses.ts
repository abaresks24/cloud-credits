/**
 * addresses.ts — single source of truth for on-chain addresses (SPEC §4.2).
 *
 * NEVER invent an address. Every entry below was read from the official docs on the date noted and
 * verified on-chain with `cast code` (bytecode present) on Sepolia.
 *
 * Chain: Ethereum Sepolia (11155111) — the only chain this project targets (SPEC §4.1).
 * Retrieved & verified: 2026-09-06.
 *
 * Sources:
 *  - Uniswap v4:  https://developers.uniswap.org/docs/protocols/v4/deployments
 *  - ENSv2 beta:  https://docs.ens.domains/learn/deployments  (Sepolia beta section)
 */

export const CHAIN_ID = 11155111;

/**
 * Uniswap v4 — verified on-chain 2026-09-06 (all have bytecode; PoolManager.owner() responds
 * with 0x5b73C5498c1E3b4dbA84de0F1833c4a029d90519, the Uniswap Sepolia owner).
 */
export const uniswap = {
  poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
  universalRouter: "0x3A9D48AB9751398BbFa63ad67599Bb04e4BdF98b",
  positionManager: "0x429ba70129df741B2Ca2a85BC3A2a3328e5c09b4",
  stateView: "0xe1dd9c3fa50edb962e442f60dfbc432e24537e4c",
  v4Quoter: "0x61b3f2011a92d183c7dbadbda940a7555ccf9227",
  poolSwapTest: "0x9b6b46e2c869aa39918db7f52f5557fe577b6eee",
  poolModifyLiquidityTest: "0x0c478023803a644c94c4ce1c1e7b9a087e411b0a",
  permit2: "0x000000000022D473030F116dDEE9F6B43aC78BA3",
} as const;

/**
 * ENSv2 (Sepolia beta) — bytecode-verified on-chain 2026-09-06.
 * ⚠️ Beta, interfaces non figées (SPEC §4.3): confirm each function SIGNATURE on-chain at the point
 * of use (J2, EnsSellerRegistry) before relying on it — presence of bytecode is not proof of ABI.
 */
export const ens = {
  ethRegistry: "0xbdc85dd5b15d7ecb354cd7cb6f2c50b4f2c4f0e2",
  rootRegistry: "0x8115186e8f2e0b0281e86ab91f0f48ba90364354",
  universalResolverV2: "0x4a1817d13e9cf196f471725176355c1234b63c70",
  publicResolverV2: "0xe7b9a25607e02da8145e4eb1836ca539e53f11f7",
  permissionedResolverImpl: "0x9eae5c2730a7dd16bdd1dee6421a1b91e3b0365e",
  ensV2Resolver: "0x508cb4e4596429ca98a1bb3112d88d18f92456b5",
  ethRegistrar: "0xa88553f454b77203b0d036a05c894d555eaaa2cc",
  rentPriceOracle: "0x8914b66260EB8C4fff795650c3AE8Cd335958987",
  // Registration is paid in an approved ERC-20 (not ETH). MockUSDC is freely mintable (mint(addr,amt))
  // and accepted (oracle.isPaymentToken == true) — verified on-chain 2026-09-06.
  mockUSDC: "0x768f42455a2d082e23ceef7d51e5787c82d67a39",
  mockDAI: "0x5472c5725a00b7ba11f0794a79d08ade6f4683bd",
  circleUSDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238", // also accepted, but faucet-gated
} as const;

/**
 * Ours — registered / deployed by us.
 * cloudcredits.eth registered 2026-09-06 via the ENSv2 beta ETHRegistrar (commit-reveal, paid 8 MockUSDC),
 * owner = dev wallet, resolver = PublicResolverV2. Verified: ethRegistry.getResolver("cloudcredits")
 * returns PublicResolverV2, so the name resolves (J1 checkpoint met).
 */
export const ours = {
  ensName: "cloudcredits.eth",
  ensNode: "0xfc47d1666a0b864f859c0b1b22510ec26cd8f97786426433b8031f31ef03c78b", // namehash
  ensLabelhash: "0x40ee1890d2500975ef98e231d136d8ac83475c31ea7cee7bffb993c424d82b0b",
  usdcTest: "0x768f42455a2d082e23ceef7d51e5787c82d67a39", // MockUSDC reused as the pool's test USDC (mintable)

  // Deployed on Sepolia 2026-09-08 (script/Deploy.s.sol) — conformant buy verified on-chain.
  // Includes the SellerBond (collateral): a seller must be bonded to list; slashable on fraud.
  commitmentToken: "0x4e9698256dC1654876086374B2B2655D97941280", // $100k AWS, 24-month expiry
  commitmentResolver: "0xD682c2f8C498A3B08C52E7c27891284Ab7A79dAe",
  ensSellerRegistry: "0x05E00f06019DE4964314B6Ff727a098341c0f17a",
  ensEligibilityAdapter: "0x4B909eE2C0c919D18b284177EE2830457E14818A",
  sellerBond: "0x9a880f885445bAF769E98D57Dda814E3d6aADef4",
  timeDecayHook: "0xB5E5daeE51a2cbd5db6Fc021db0A091cac928888", // low bits 0x888 = swap+returnsDelta+addLiq flags
  commitmentRouter: "0xc0363da931c198fab1533F2B1486d794A5931B6c",
} as const;
