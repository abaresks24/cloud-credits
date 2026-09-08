import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";

/** Live Sepolia deployment (see ../addresses.ts / docs/DEPLOYMENTS.md). */
export const addr = {
  poolManager: "0xE03A1074c86CFeDd5C142C4F04F1a1536e203543",
  usdc: "0x768f42455a2d082e23ceef7d51e5787c82d67a39", // MockUSDC (mintable, 6dp)
  token: "0x4e9698256dC1654876086374B2B2655D97941280", // CommitmentToken ccAWS
  resolver: "0xD682c2f8C498A3B08C52E7c27891284Ab7A79dAe",
  registry: "0x05E00f06019DE4964314B6Ff727a098341c0f17a",
  adapter: "0x4B909eE2C0c919D18b284177EE2830457E14818A",
  bond: "0x9a880f885445bAF769E98D57Dda814E3d6aADef4",
  hook: "0xB5E5daeE51a2cbd5db6Fc021db0A091cac928888",
  router: "0xc0363da931c198fab1533F2B1486d794A5931B6c",
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
