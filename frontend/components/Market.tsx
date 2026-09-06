"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatUnits, parseUnits, maxUint256 } from "viem";
import { addr } from "@/lib/config";
import { tokenAbi, erc20Abi, hookAbi, adapterAbi, routerAbi } from "@/lib/abis";
import { buildBuy } from "@/lib/pool";
import { ValueCurve } from "@/components/ValueCurve";

const f6 = (v?: bigint) => (v != null ? Number(formatUnits(v, 6)).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—");

export function Market() {
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const [usdcIn, setUsdcIn] = useState("1000");
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [tx, setTx] = useState<`0x${string}` | undefined>();

  const q = { enabled: !!address };
  const { data: eligible, refetch: rEl } = useReadContract({ address: addr.adapter, abi: adapterAbi, functionName: "isEligible", args: [address!], query: q });
  const { data: factor } = useReadContract({ address: addr.hook, abi: hookAbi, functionName: "currentFactorBips" });
  const { data: faceValue } = useReadContract({ address: addr.token, abi: tokenAbi, functionName: "faceValue" });
  const { data: expiry } = useReadContract({ address: addr.token, abi: tokenAbi, functionName: "expiry" });
  const { data: acme, refetch: rA } = useReadContract({ address: addr.token, abi: tokenAbi, functionName: "balanceOf", args: [address!], query: q });
  const { data: usdc, refetch: rU } = useReadContract({ address: addr.usdc, abi: erc20Abi, functionName: "balanceOf", args: [address!], query: q });
  const { data: allow, refetch: rAllow } = useReadContract({ address: addr.usdc, abi: erc20Abi, functionName: "allowance", args: [address!, addr.router], query: q });

  const factorPct = factor != null ? Number(factor) / 100 : undefined; // bips -> %
  const price = factor != null ? (Number(factor) / 10000).toFixed(4) : "—"; // USDC per ACME
  const approved = (allow as bigint | undefined) ? (allow as bigint) > 0n : false;
  const canBuy = !!eligible && approved;

  const refresh = () => { rEl(); rA(); rU(); rAllow(); };
  const run = async (label: string, fn: () => Promise<`0x${string}`>) => {
    setErr(""); setBusy(label);
    try { const h = await fn(); setTx(h); await new Promise((r) => setTimeout(r, 1800)); refresh(); }
    catch (e: any) { setErr(e?.shortMessage ?? e?.message ?? "transaction failed"); }
    finally { setBusy(""); }
  };
  const faucet = () => run("Minting test USDC", () => writeContractAsync({ address: addr.usdc, abi: erc20Abi, functionName: "mint", args: [address!, parseUnits("10000", 6)] }));
  const approve = () => run("Approving router", () => writeContractAsync({ address: addr.usdc, abi: erc20Abi, functionName: "approve", args: [addr.router, maxUint256] }));
  const buy = () => run("Buying ACME", () => writeContractAsync({ address: addr.router, abi: routerAbi, functionName: "swap", args: buildBuy(parseUnits(usdcIn || "0", 6)) as any }));

  const est = factor && Number(factor) > 0 ? (Number(usdcIn || "0") * 10000 / Number(factor)).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—";

  return (
    <div className="grid">
      <div className="card">
        <h2>Acme Corp — $100k AWS commitment</h2>
        <div className="sub">Tokenized (ccAWS) · trades against test USDC · price set by the v4 time-decay hook</div>

        <div className="stat">
          <div className="box"><div className="l">Price / ccAWS</div><div className="n">${price}</div></div>
          <div className="box"><div className="l">Decay factor</div><div className="n">{factorPct != null ? factorPct.toFixed(1) + "%" : "—"}</div></div>
          <div className="box"><div className="l">Face value</div><div className="n">${faceValue != null ? Number(faceValue).toLocaleString() : "—"}</div></div>
        </div>

        {faceValue != null && expiry != null && (
          <ValueCurve faceValue={Number(faceValue)} expiry={Number(expiry)} />
        )}
      </div>

      <div className="card">
        <h2>Buy</h2>
        <div className="sub">Verified buyers only — eligibility is read live from ENS.</div>

        <div className="row"><span className="k">Your eligibility</span><span className="v">
          {!isConnected ? "connect wallet" : eligible ? <span className="pill ok"><span className="dot" />verified</span> : <span className="pill bad"><span className="dot" />not verified</span>}
        </span></div>
        <div className="row"><span className="k">ccAWS balance</span><span className="v">{f6(acme as bigint)}</span></div>
        <div className="row"><span className="k">USDC balance</span><span className="v">{f6(usdc as bigint)}</span></div>

        <label>USDC to spend</label>
        <input value={usdcIn} onChange={(e) => setUsdcIn(e.target.value)} inputMode="decimal" />
        <div className="notice">≈ {est} ccAWS at the current decayed price.</div>

        <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
          <button className="btn ghost" onClick={faucet} disabled={!isConnected || !!busy}>Get 10k test USDC</button>
          {!approved && <button className="btn ghost" onClick={approve} disabled={!isConnected || !!busy}>Approve router</button>}
          <button className="btn primary" onClick={buy} disabled={!isConnected || !canBuy || !!busy || Number(usdcIn) <= 0}>{busy || "Buy ccAWS"}</button>
        </div>

        {isConnected && !eligible && <div className="notice">You are not verified. Go to <b>Sell / Onboard</b> to complete Selfie Check, or use the <b>Desk</b> to onboard an address.</div>}
        {err && <div className="notice bad mono">{err}</div>}
        {tx && !err && <div className="notice">Recorded: <a className="mono" href={`https://sepolia.etherscan.io/tx/${tx}`} target="_blank" rel="noreferrer">{tx.slice(0, 14)}…</a></div>}
      </div>
    </div>
  );
}
