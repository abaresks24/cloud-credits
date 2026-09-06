import { NextResponse } from "next/server";
import { signRequest } from "@worldcoin/idkit/signing";

// World ID 4.0 requires a signed RP context (nonce + timestamps signed with the RP's signing key).
// The signing key is SECRET and lives only here (server env). rp_id + action are public.
const RP_ID = process.env.NEXT_PUBLIC_WORLD_RP_ID ?? "rp_e9119ca69759b413";
const ACTION = process.env.NEXT_PUBLIC_WORLD_ACTION ?? "sell-commitment";

export async function GET() {
  const signingKeyHex = process.env.WORLD_RP_SIGNING_KEY;
  if (!signingKeyHex) {
    return NextResponse.json(
      { error: "WORLD_RP_SIGNING_KEY not set — add the RP signing key from the World Developer Portal as a server env var." },
      { status: 501 },
    );
  }
  try {
    const s = signRequest({ signingKeyHex, action: ACTION });
    return NextResponse.json({
      rp_context: { rp_id: RP_ID, nonce: s.nonce, created_at: s.createdAt, expires_at: s.expiresAt, signature: s.sig },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "failed to sign request" }, { status: 500 });
  }
}
