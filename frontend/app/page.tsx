"use client";

import { useState } from "react";
import { ConnectButton } from "@/components/ConnectButton";
import { Landing } from "@/components/Landing";
import { Market } from "@/components/Market";
import { Onboard } from "@/components/Onboard";
import { Desk } from "@/components/Desk";
import { Footer } from "@/components/Footer";

type Tab = "market" | "sell" | "desk";

export default function Page() {
  const [entered, setEntered] = useState(false);
  const [tab, setTab] = useState<Tab>("market");

  if (!entered) {
    return (
      <div className="wrap">
        <Landing onEnter={() => setEntered(true)} />
      </div>
    );
  }

  return (
    <div className="wrap">
      <nav className="nav">
        <button className="brand" style={{ border: "none", background: "none", cursor: "pointer" }} onClick={() => setEntered(false)}>
          <span className="logo">C</span> Cloud Credits
        </button>
        <div className="tabs">
          <button className={`tab ${tab === "market" ? "active" : ""}`} onClick={() => setTab("market")}>Market</button>
          <button className={`tab ${tab === "sell" ? "active" : ""}`} onClick={() => setTab("sell")}>Sell</button>
          <button className={`tab ${tab === "desk" ? "active" : ""}`} onClick={() => setTab("desk")}>Desk</button>
        </div>
        <ConnectButton />
      </nav>

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

      <Footer />
    </div>
  );
}
