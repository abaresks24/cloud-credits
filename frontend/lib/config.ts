import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

/** Live Sepolia deployment (see ../addresses.ts / docs/DEPLOYMENTS.md). */
export const addr = {
  poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
  usdc: "0x768f42455a2d082e23ceef7d51e5787c82d67a39", // MockUSDC (mintable, 6dp)
  token: "0x607840F8fC994228F407dAeDe17ce52f0f85C770", // CommitmentToken ccAWS
  resolver: "0x0286F6e5939b58Bf895C75826d4286Bf94731Fa4",
  registry: "0x94E8D7225D39FCc31Dc41bdD840D047f74317060",
  adapter: "0x97e0c5DF3E110bD57961396E53Eba638D7cbACcA",
  hook: "0x336491F60Cb6aF7061d7112f2475067821238888",
  router: "0xF20af8371B4dBa71562399607d18bb05FAB8A682",
} as const;

/** cloudcredits.eth node (the demo seller identity). */
export const DEMO_NODE = "0xfc47d1666a0b864f859c0b1b22510ec26cd8f97786426433b8031f31ef03c78b" as const;

/** Pool params (must match the deployment). token < usdc, so token is currency0. */
export const pool = {
  fee: 3000,
  tickSpacing: 60,
  tokenIsCurrency0: addr.token.toLowerCase() < addr.usdc.toLowerCase(),
} as const;

/** World ID 4.0 (Selfie Check via Relying Party). app_id + rp_id are public; the signing key is not.
 *  Verify endpoint: https://developer.world.org/api/v4/verify/{rp_id}. */
export const world = {
  appId: (process.env.NEXT_PUBLIC_WORLD_APP_ID ?? "app_d70a6166fdce8cfa69c435368cd2d090") as `app_${string}`,
  rpId: process.env.NEXT_PUBLIC_WORLD_RP_ID ?? "rp_e9119ca69759b413",
  action: process.env.NEXT_PUBLIC_WORLD_ACTION ?? "sell-commitment",
};

const rpc = http(process.env.NEXT_PUBLIC_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com");

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected()],
  transports: { [sepolia.id]: rpc },
});
