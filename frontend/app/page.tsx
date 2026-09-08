"use client";

import { useState } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import { Market } from "@/components/Market";
import { Onboard } from "@/components/Onboard";
import { Desk } from "@/components/Desk";

type Tab = "market" | "sell" | "desk";

export default function Home() {
  const [tab, setTab] = useState<Tab>("market");
  return (
    <div className="wrap">
      <nav className="nav">
        <div className="brand"><span className="logo" /> Cloud Credits</div>
        <div className="tabs">
          <button className={`tab ${tab === "market" ? "active" : ""}`} onClick={() => setTab("market")}>Market</button>
          <button className={`tab ${tab === "sell" ? "active" : ""}`} onClick={() => setTab("sell")}>Sell / Onboard</button>
          <button className={`tab ${tab === "desk" ? "active" : ""}`} onClick={() => setTab("desk")}>Desk</button>
        </div>
        <ConnectButton />
      </nav>

      {tab === "market" && (
        <header className="hero">
          <span className="eyebrow">◆ Uniswap v4 · ENSv2 · World</span>
          <h1>Resell unused cloud commitments, priced by <span className="g">time to maturity</span>.</h1>
          <p>
            ~29% of cloud spend is wasted and fewer than half of orgs fully use their commitment
            discounts (Flexera). Buy that unused capacity at a discount that widens as expiry
            approaches — the price decays mechanically, enforced by a Uniswap v4 hook.
          </p>
        </header>
      )}

      {tab === "market" && <Market />}
      {tab === "sell" && (
        <>
          <div className="sect"><span className="num">01</span><h2>Sell a commitment</h2></div>
          <Onboard />
        </>
      )}
      {tab === "desk" && (
        <>
          <div className="sect"><span className="num">02</span><h2>Compliance desk</h2></div>
          <Desk />
        </>
      )}

      <footer className="foot">
        Sepolia testnet · hook <a className="mono" href="https://sepolia.etherscan.io/address/0xB5E5daeE51a2cbd5db6Fc021db0A091cac928888" target="_blank" rel="noreferrer">0xB5E5…8888</a>
        {" · "}<a href="https://github.com/abaresks24/cloud-credits" target="_blank" rel="noreferrer">GitHub</a>
        {" · "}Demo asset, not a real security. Cloud contracts restrict transfer — real deployment needs provider consent.
      </footer>
    </div>
  );
}
