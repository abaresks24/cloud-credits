"use client";

import { useState } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import { Home } from "@/components/Home";
import { Market } from "@/components/Market";
import { Onboard } from "@/components/Onboard";
import { Desk } from "@/components/Desk";

type Tab = "home" | "market" | "sell" | "desk";

export default function Page() {
  const [tab, setTab] = useState<Tab>("home");
  return (
    <div className="wrap">
      <nav className="nav">
        <button className="brand" style={{ border: "none", background: "none", cursor: "pointer" }} onClick={() => setTab("home")}>
          <span className="logo">C</span> Cloud Credits
        </button>
        <div className="tabs">
          <button className={`tab ${tab === "home" ? "active" : ""}`} onClick={() => setTab("home")}>Home</button>
          <button className={`tab ${tab === "market" ? "active" : ""}`} onClick={() => setTab("market")}>Market</button>
          <button className={`tab ${tab === "sell" ? "active" : ""}`} onClick={() => setTab("sell")}>Sell</button>
          <button className={`tab ${tab === "desk" ? "active" : ""}`} onClick={() => setTab("desk")}>Desk</button>
        </div>
        <ConnectButton />
      </nav>

      {tab === "home" && <Home onEnter={() => setTab("market")} />}
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
