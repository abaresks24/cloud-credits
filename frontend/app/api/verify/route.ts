import { NextResponse } from "next/server";
import { createWalletClient, http, namehash, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

// World ID 4.0 verify endpoint (Relying Party). rp_id + action are public.
const RP_ID = process.env.NEXT_PUBLIC_WORLD_RP_ID ?? "rp_e9119ca69759b413";
const ACTION = process.env.NEXT_PUBLIC_WORLD_ACTION ?? "sell-commitment";

const RESOLVER = "0x0286F6e5939b58Bf895C75826d4286Bf94731Fa4";
const ADAPTER = "0x97e0c5DF3E110bD57961396E53Eba638D7cbACcA";
const RPC = process.env.SEPOLIA_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

const resolverAbi = [
  { type: "function", name: "onboard", stateMutability: "nonpayable", inputs: [{ type: "bytes32" }, { type: "string" }, { type: "string" }, { type: "uint64" }], outputs: [] },
] as const;
const adapterAbi = [
  { type: "function", name: "bind", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "bytes32" }], outputs: [] },
] as const;

export async function POST(req: Request) {
  try {
    const { result, address } = await req.json();
    if (!result) return NextResponse.json({ error: "missing proof" }, { status: 400 });

    // 1) verify the proof with World (World ID 4.0: raw IDKit response forwarded, scoped to rp_id)
    const wr = await fetch(`https://developer.world.org/api/v4/verify/${RP_ID}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...result, action: ACTION, signal: address ?? "" }),
    });
    if (!wr.ok) {
      const detail = await wr.text();
      return NextResponse.json({ verified: false, error: `World verify failed: ${detail.slice(0, 200)}` }, { status: 400 });
    }

    // 2) on success, onboard the address on-chain (desk key, server-only). Best-effort.
    let onboarded = false;
    let node: string | undefined;
    const deskKey = process.env.DESK_PRIVATE_KEY as `0x${string}` | undefined;
    if (deskKey && address) {
      const user = getAddress(address);
      node = namehash(`${user.slice(2).toLowerCase()}.cloudcredits.eth`);
      const wallet = createWalletClient({ account: privateKeyToAccount(deskKey), chain: sepolia, transport: http(RPC) });
      const expires = BigInt(Math.floor(Date.now() / 1000) + 730 * 24 * 3600);
      await wallet.writeContract({ address: RESOLVER, abi: resolverAbi, functionName: "onboard", args: [node as `0x${string}`, "aws", "worldid", expires] });
      await wallet.writeContract({ address: ADAPTER, abi: adapterAbi, functionName: "bind", args: [user, node as `0x${string}`] });
      onboarded = true;
    }

    return NextResponse.json({ verified: true, onboarded, node });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "server error" }, { status: 500 });
  }
}
