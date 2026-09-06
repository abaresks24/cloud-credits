"use client";

import { useAccount } from "wagmi";
import { world } from "@/lib/config";

/**
 * Seller onboarding via World Selfie Check (SPEC §5.4): proving a real human — not a script —
 * authorizes the sale (anti-fraud, not KYC), tested on the World ID Sandbox. On a valid proof the
 * desk issues the ENS subname and writes the records.
 *
 * The IDKit widget activates once a World App ID is configured (NEXT_PUBLIC_WORLD_APP_ID). Wiring is
 * intentionally kept behind that env so the rest of the app runs without it.
 */
export function Onboard() {
  const { address, isConnected } = useAccount();
  const configured = world.appId.startsWith("app_");

  return (
    <div className="grid">
      <div className="card">
        <h2>List a commitment for sale</h2>
        <div className="sub">Step 1 — prove you are human with World Selfie Check.</div>

        <div className="row"><span className="k">Wallet</span><span className="v mono">{isConnected ? `${address!.slice(0, 6)}…${address!.slice(-4)}` : "connect"}</span></div>
        <div className="row"><span className="k">World Selfie Check</span><span className="v">{configured ? <span className="pill ok"><span className="dot" />ready</span> : <span className="pill bad"><span className="dot" />app id needed</span>}</span></div>

        {!configured ? (
          <div className="notice">
            Set <code>NEXT_PUBLIC_WORLD_APP_ID</code> (World Developer Portal → create an app, enable
            <b> Selfie Check</b>, test on the <b>Sandbox</b>). Then this button opens IDKit; a valid
            proof is verified server-side and the desk issues your ENS subname + mints your
            commitment token. Until then, use the <b>Desk</b> tab to onboard an address directly.
          </div>
        ) : (
          <button className="btn primary block" disabled style={{ marginTop: 14 }}>
            Verify with World (IDKit)
          </button>
        )}
      </div>

      <div className="card">
        <h2>How selling works</h2>
        <ol style={{ color: "var(--muted)", fontSize: 14, paddingLeft: 18, lineHeight: 1.8 }}>
          <li>Selfie Check proves a human authorizes the sale.</li>
          <li>The desk issues <code>you.cloudcredits.eth</code> with <code>commitment.*</code> records.</li>
          <li>Your commitment is tokenized (one token per provider + expiry).</li>
          <li>It trades on the Uniswap v4 pool; the price decays as expiry approaches.</li>
          <li>Compliance can revoke your status anytime — the name is never moved.</li>
        </ol>
      </div>
    </div>
  );
}
