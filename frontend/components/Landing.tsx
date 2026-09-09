"use client";

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <>
      <nav className="nav">
        <div className="brand"><span className="logo">C</span> Cloud Credits</div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <a className="lnav" href="https://github.com/abaresks24/cloud-credits" target="_blank" rel="noreferrer">Code</a>
          <button className="btn primary" onClick={onEnter}>Launch app</button>
        </div>
      </nav>

      <section className="land-hero">
        <div className="kicker">Cloud commitment marketplace</div>
        <h1>Turn unused cloud commitments into cash.</h1>
        <p>
          Companies pre-pay years of AWS, Google Cloud and Azure to unlock discounts — then leave much of
          it unused. Cloud Credits is where they resell that capacity to a company that needs it, priced
          by how much time is left to consume the credit.
        </p>
        <div className="home-cta">
          <button className="btn primary lg" onClick={onEnter}>Launch app</button>
          <a className="btn lg" href="https://github.com/abaresks24/cloud-credits" target="_blank" rel="noreferrer">View the code</a>
        </div>

        <div className="land-stats">
          <div><b>~29%</b><span>of cloud spend is wasted (Flexera, 2026)</span></div>
          <div><b>&lt;50%</b><span>of orgs fully use their commitment discounts</span></div>
          <div><b>$0</b><span>markets to resell that unused capacity today</span></div>
        </div>
      </section>

      <section className="land-sec">
        <h2>How it works</h2>
        <p className="lead">A commitment loses value as it nears expiry — less time to use it. The market prices that automatically.</p>
        <div className="steps">
          <div className="step"><div className="no">01 — Sell</div><h3>List what you won't use</h3><p>Verify you're human (World) and get a verifiable identity (ENS), then tokenize your commitment. It's on sale instantly.</p></div>
          <div className="step"><div className="no">02 — Priced by maturity</div><h3>The discount widens over time</h3><p>A Uniswap v4 hook sets the price from the time left to consume the credit — near expiry it's cheap, at expiry it's worthless.</p></div>
          <div className="step"><div className="no">03 — Buy</div><h3>Acquire capacity at a discount</h3><p>A verified buyer picks it up below face value and captures the discount if they consume it in time.</p></div>
        </div>
        <div className="home-cta" style={{ marginTop: 34 }}>
          <button className="btn primary lg" onClick={onEnter}>Enter the market</button>
        </div>
      </section>

      <footer className="foot">
        Sepolia testnet · <a href="https://github.com/abaresks24/cloud-credits" target="_blank" rel="noreferrer">GitHub</a>
        {" · "}Demo asset, not a real security. Cloud contracts restrict transfer — real deployment needs provider consent.
      </footer>
    </>
  );
}
