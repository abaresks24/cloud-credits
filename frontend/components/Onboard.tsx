"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { IDKitRequestWidget, selfieCheckLegacy, type IDKitResult, type RpContext } from "@worldcoin/idkit";
import { world } from "@/lib/config";

/**
 * Seller onboarding via World Selfie Check — World ID 4.0 (Relying-Party) flow.
 *  1. server signs an RP context (signRequest, RP signing key) — /api/world-context
 *  2. IDKitRequestWidget runs the selfieCheckLegacy preset against that context
 *  3. the proof is verified server-side (/api/verify → developer.world.org/api/v4/verify/{rp_id})
 *     and, on success, the desk onboards the address (ENS records + eligibility).
 */
export function Onboard() {
  const { address, isConnected } = useAccount();
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<{ ok?: boolean; msg?: string; busy?: boolean }>({});

  const start = async () => {
    setState({ busy: true, msg: "Preparing…" });
    try {
      const r = await fetch("/api/world-context");
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "could not prepare World request");
      setRpContext(d.rp_context);
      setState({ busy: false });
      setOpen(true);
    } catch (e: any) {
      setState({ ok: false, msg: e?.message ?? "failed" });
    }
  };

  const handleVerify = async (result: IDKitResult) => {
    setState({ busy: true, msg: "Verifying proof…" });
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ result, address }),
    });
    const data = await res.json();
    if (!res.ok || !data.verified) {
      setState({ ok: false, busy: false, msg: data.error ?? "verification failed" });
      throw new Error(data.error ?? "verification failed");
    }
    setState({ ok: true, busy: false, msg: data.onboarded ? "Verified — onboarded, you can now trade." : "Verified." });
  };

  return (
    <div className="grid">
      <div className="card">
        <h2>List a commitment for sale</h2>
        <div className="sub">Step 1 — prove you are a real human with World Selfie Check.</div>

        <div className="row"><span className="k">Wallet</span><span className="v mono">{isConnected ? `${address!.slice(0, 6)}…${address!.slice(-4)}` : "connect wallet"}</span></div>
        <div className="row"><span className="k">Verification</span><span className="v">
          {state.ok ? <span className="state ok">Verified</span> : state.ok === false ? <span className="state bad">Failed</span> : "—"}
        </span></div>

        <div style={{ marginTop: 14 }}>
          <button className="btn primary block" onClick={start} disabled={!isConnected || state.busy}>
            {state.busy ? state.msg : "Verify with World Selfie Check"}
          </button>
        </div>

        {rpContext && (
          <IDKitRequestWidget
            app_id={world.appId}
            action={world.action}
            rp_context={rpContext}
            allow_legacy_proofs={false}
            environment="sandbox"
            preset={selfieCheckLegacy({ signal: address ?? "" })}
            open={open}
            onOpenChange={setOpen}
            handleVerify={handleVerify}
            onSuccess={() => {}}
          />
        )}

        {state.msg && !state.busy && <div className={`notice ${state.ok === false ? "bad" : ""}`}>{state.msg}</div>}
        {!isConnected && <div className="notice">Connect your wallet first — the proof is bound to your address.</div>}
      </div>

      <div className="card">
        <h2>How selling works</h2>
        <ol style={{ color: "var(--muted)", fontSize: 14, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Selfie Check proves a human authorizes the sale (anti-fraud, not KYC).</li>
          <li>The desk issues <code>you.cloudcredits.eth</code> with <code>commitment.*</code> records.</li>
          <li>Your commitment trades on the Uniswap v4 pool; the price decays toward expiry.</li>
          <li>Compliance can revoke your status anytime — the ENS name is never moved.</li>
        </ol>
        <div className="notice">Tested on the World ID Sandbox (fictional users, no real biometrics).</div>
      </div>
    </div>
  );
}
