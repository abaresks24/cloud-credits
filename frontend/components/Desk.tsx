"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { namehash } from "viem/ens";
import { addr } from "@/lib/config";
import { resolverAbi, adapterAbi } from "@/lib/abis";

/**
 * Compliance desk. Onboards a holder (writes commitment.* into our ENS resolver + binds the address)
 * and revokes/reactivates by flipping commitment.status. Operate from the issuer/officer wallet
 * (the deploy wallet). Revocation never moves the ENS name — it's a single status write (EAC).
 */
export function Desk() {
  const { isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [holder, setHolder] = useState("");
  const [label, setLabel] = useState("acme");
  const [provider, setProvider] = useState("aws");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [target, setTarget] = useState("");

  const targetOk = /^0x[0-9a-fA-F]{40}$/.test(target);
  const { data: node, refetch: rNode } = useReadContract({ address: addr.adapter, abi: adapterAbi, functionName: "nodeOf", args: [target as `0x${string}`], query: { enabled: targetOk } });
  const bound = node && node !== "0x0000000000000000000000000000000000000000000000000000000000000000";
  const { data: status, refetch: rStatus } = useReadContract({ address: addr.resolver, abi: resolverAbi, functionName: "text", args: [node as `0x${string}`, "commitment.status"], query: { enabled: !!bound } });
  const { data: eligible, refetch: rEl } = useReadContract({ address: addr.adapter, abi: adapterAbi, functionName: "isEligible", args: [target as `0x${string}`], query: { enabled: targetOk } });

  const run = async (l: string, fn: () => Promise<any>) => {
    setErr(""); setBusy(l);
    try { await fn(); await new Promise((r) => setTimeout(r, 1800)); rNode(); rStatus(); rEl(); }
    catch (e: any) { setErr(e?.shortMessage ?? e?.message ?? "transaction failed"); }
    finally { setBusy(""); }
  };

  const onboard = () => {
    if (!/^0x[0-9a-fA-F]{40}$/.test(holder) || !label) { setErr("Enter a valid address and label."); return; }
    const nodeH = namehash(`${label}.cloudcredits.eth`);
    const expires = BigInt(Math.floor(Date.now() / 1000) + 730 * 24 * 3600);
    return run("Onboarding", async () => {
      await writeContractAsync({ address: addr.resolver, abi: resolverAbi, functionName: "onboard", args: [nodeH, provider, "attested", expires] });
      await writeContractAsync({ address: addr.adapter, abi: adapterAbi, functionName: "bind", args: [holder as `0x${string}`, nodeH] });
    });
  };
  const setStatus = (s: string) => {
    if (!bound) { setErr("This address has no bound credential."); return; }
    return run(s === "active" ? "Reactivating" : "Revoking", () =>
      writeContractAsync({ address: addr.resolver, abi: resolverAbi, functionName: "setStatus", args: [node as `0x${string}`, s] }));
  };

  return (
    <div className="grid">
      <div className="card">
        <h2>Onboard a seller / buyer</h2>
        <div className="sub">Writes commitment.* into ENS and binds the address (issuer wallet).</div>
        <label>Holder address</label>
        <input value={holder} onChange={(e) => setHolder(e.target.value.trim())} placeholder="0x…" />
        <div style={{ display: "flex", gap: 12 }}>
          <div style={{ flex: 1 }}><label>Subname label</label><input value={label} onChange={(e) => setLabel(e.target.value.trim())} placeholder="acme" /></div>
          <div style={{ width: 140 }}><label>Provider</label>
            <select value={provider} onChange={(e) => setProvider(e.target.value)}><option>aws</option><option>gcp</option><option>azure</option></select>
          </div>
        </div>
        <div className="notice">→ {label || "<label>"}.cloudcredits.eth, status active</div>
        <div style={{ marginTop: 14 }}><button className="btn primary block" onClick={onboard} disabled={!isConnected || !!busy}>{busy === "Onboarding" ? "Onboarding…" : "Issue credential"}</button></div>
      </div>

      <div className="card">
        <h2>Revoke / reactivate</h2>
        <div className="sub">Flips commitment.status only — the ENS name is never moved (EAC).</div>
        <label>Address</label>
        <input value={target} onChange={(e) => setTarget(e.target.value.trim())} placeholder="0x…" />
        {targetOk && (
          <>
            <div className="row"><span className="k">Status</span><span className="v">{bound ? (status as string) || "—" : "unregistered"}</span></div>
            <div className="row"><span className="k">Eligible</span><span className="v">{eligible ? <span className="pill ok"><span className="dot" />yes</span> : <span className="pill bad"><span className="dot" />no</span>}</span></div>
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button className="btn danger" onClick={() => setStatus("revoked")} disabled={!!busy}>Revoke</button>
              <button className="btn ghost" onClick={() => setStatus("active")} disabled={!!busy}>Reactivate</button>
            </div>
          </>
        )}
        {err && <div className="notice bad mono">{err}</div>}
      </div>
    </div>
  );
}
