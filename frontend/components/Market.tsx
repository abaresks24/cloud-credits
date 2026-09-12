"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { formatUnits, parseUnits, maxUint256 } from "viem";
import { addr } from "@/lib/config";
import { tokenAbi, erc20Abi, hookAbi, adapterAbi, routerAbi } from "@/lib/abis";
import { buildBuy } from "@/lib/pool";
import { ValueCurve } from "@/components/ValueCurve";

const f6 = (v?: bigint) => (v != null ? Number(formatUnits(v, 6)).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—");

function monthsUntil(expiry?: number) {
  if (!expiry) return undefined;
  return Math.max(0, (expiry - Math.floor(Date.now() / 1000)) / (30 * 24 * 3600));
}

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

  const f01 = factor != null ? Number(factor) / 10000 : undefined; // 0..1
  const price = f01 != null ? f01.toFixed(3) : "—";
  const discount = f01 != null ? ((1 - f01) * 100).toFixed(1) : "—";
  const months = monthsUntil(expiry != null ? Number(expiry) : undefined);
  const maturityDate = expiry != null ? new Date(Number(expiry) * 1000).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—";
  const est = f01 && f01 > 0 ? (Number(usdcIn || "0") / f01).toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—";

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
  const buy = () => run("Buying ccAWS", () => writeContractAsync({ address: addr.router, abi: routerAbi, functionName: "swap", args: buildBuy(parseUnits(usdcIn || "0", 6)) as any }));

  return (
    <div>
      <div className="market-head">
        <div className="asset">
          <div className="ico">AWS</div>
          <div>
            <div className="name">Acme Corp — AWS spend commitment</div>
            <div className="meta">ccAWS · trades vs USDC on Uniswap v4 · matures {maturityDate}</div>
          </div>
        </div>
        <div className="maturity">
          <div className="lbl">Matures in</div>
          <div className="big">{months != null ? `${months.toFixed(0)} mo` : "—"}</div>
        </div>
      </div>

      <div className="grid">
        <div>
          <div className="card">
            <div className="tiles">
              <div className="tile"><div className="l">Discount to face</div><div className="n good">{discount}%</div><div className="s">the deal you capture</div></div>
              <div className="tile"><div className="l">Price / ccAWS</div><div className="n">${price}</div><div className="s">USDC per $1 of face</div></div>
              <div className="tile"><div className="l">Face value</div><div className="n">${faceValue != null ? Number(faceValue).toLocaleString() : "—"}</div><div className="s">AWS commitment</div></div>
              <div className="tile"><div className="l">Maturity</div><div className="n">{maturityDate}</div><div className="s">credit lost after</div></div>
            </div>
          </div>

          <div className="card">
            <h2>Value to maturity</h2>
            <div className="sub">The price is set mechanically by the v4 hook from the time left to consume the credit.</div>
            {faceValue != null && expiry != null && <ValueCurve faceValue={Number(faceValue)} expiry={Number(expiry)} />}
          </div>
        </div>

        <div className="card" style={{ position: "sticky", top: 84 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <h2>Buy</h2>
            {isConnected && <span className={`state ${eligible ? "ok" : "bad"}`}>{eligible ? "Verified" : "Not verified"}</span>}
          </div>
          <div className="sub">Verified buyers only — eligibility is read live from ENS.</div>

          <div className="field">
            <div className="top"><span>You pay</span><span className="mono">Balance {f6(usdc as bigint)}</span></div>
            <div className="mid">
              <input value={usdcIn} onChange={(e) => setUsdcIn(e.target.value)} inputMode="decimal" placeholder="0.0" />
              <span className="chip-token"><span className="coin" style={{ background: "var(--muted)" }}>$</span>USDC</span>
            </div>
          </div>
          <div className="field">
            <div className="top"><span>You receive (est.)</span><span className="mono">Balance {f6(acme as bigint)}</span></div>
            <div className="mid">
              <span className="est">≈ {est}</span>
              <span className="chip-token"><span className="coin" style={{ background: "var(--ink)" }}>A</span>ccAWS</span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            <button className="btn ghost" onClick={faucet} disabled={!isConnected || !!busy}>Get test USDC</button>
            {!approved && <button className="btn ghost" onClick={approve} disabled={!isConnected || !!busy}>Approve</button>}
          </div>
          <button className="btn primary block lg" style={{ marginTop: 8 }} onClick={buy} disabled={!isConnected || !canBuy || !!busy || Number(usdcIn) <= 0}>
            {busy || (!isConnected ? "Connect wallet" : !eligible ? "Get verified to buy" : "Buy ccAWS")}
          </button>

          {isConnected && !eligible && <div className="notice">Not verified. Go to <b>Sell / Onboard</b> (World Selfie Check) or use the <b>Desk</b>.</div>}
          {err && <div className="notice bad mono">{err}</div>}
          {tx && !err && <div className="notice">Recorded: <a className="mono" href={`https://sepolia.etherscan.io/tx/${tx}`} target="_blank" rel="noreferrer">{tx.slice(0, 14)}…</a></div>}
        </div>
      </div>
    </div>
  );
}
