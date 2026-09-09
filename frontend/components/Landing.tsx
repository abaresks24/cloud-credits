"use client";

import Link from "next/link";
import { Footer } from "@/components/Footer";

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="landing-screen">
      <nav className="nav">
        <div className="brand"><span className="logo">C</span> Cloud Credits</div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <Link className="lnav" href="/docs">Docs</Link>
          <button className="btn primary" onClick={onEnter}>Launch app</button>
        </div>
      </nav>

      <main className="land-main">
        <div className="land-hero">
          <div className="kicker">Cloud commitment marketplace</div>
          <h1>Turn unused cloud commitments into cash.</h1>
          <p>
            Companies pre-pay years of AWS, Google Cloud and Azure to unlock discounts — then leave much of
            it unused. Cloud Credits is where they resell that capacity, priced by the time left to consume
            the credit — enforced by a Uniswap v4 hook.
          </p>
          <div className="home-cta">
            <button className="btn primary lg" onClick={onEnter}>Launch app</button>
            <Link className="btn lg" href="/docs">Read the docs</Link>
          </div>

          <div className="land-stats">
            <div><b>~29%</b><span>of cloud spend is wasted (Flexera, 2026)</span></div>
            <div><b>&lt;50%</b><span>of orgs fully use their commitment discounts</span></div>
            <div><b>$0</b><span>markets to resell that capacity today</span></div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
