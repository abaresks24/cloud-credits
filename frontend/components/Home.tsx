"use client";

export function Home({ onEnter }: { onEnter: () => void }) {
  return (
    <div>
      <section className="home-hero">
        <div className="kicker">Cloud commitment marketplace</div>
        <h1>Turn unused cloud commitments into cash.</h1>
        <p>
          Companies pre-pay for years of AWS, Google Cloud and Azure to get discounts — then leave much
          of it unused. Cloud Credits is the marketplace to resell that unused capacity to a company that
          needs it, at a price that reflects how much time is left to consume the credit.
        </p>
        <div className="home-cta">
          <button className="btn primary lg" onClick={onEnter}>Enter the market</button>
          <a className="btn lg" href="https://github.com/abaresks24/cloud-credits" target="_blank" rel="noreferrer">View the code</a>
        </div>
      </section>

      <div className="home-stats">
        <div className="s"><div className="n">~29%</div><div className="l">of cloud spend is wasted (Flexera, 2026)</div></div>
        <div className="s"><div className="n">&lt; 50%</div><div className="l">of orgs fully use their commitment discounts</div></div>
        <div className="s"><div className="n">$0 markets</div><div className="l">where that unused capacity can be resold today</div></div>
      </div>

      <div className="band">
        <h2>How it works</h2>
        <p className="lead">A commitment loses value as it nears expiry — there's less time to use it. The market prices that automatically.</p>
        <div className="steps">
          <div className="step">
            <div className="no">01 — Sell</div>
            <h3>List what you won't use</h3>
            <p>Prove you're a real human (World), get a verifiable identity (ENS), and tokenize your commitment. It goes on sale instantly.</p>
          </div>
          <div className="step">
            <div className="no">02 — Priced by maturity</div>
            <h3>The discount widens over time</h3>
            <p>A Uniswap v4 hook sets the price from the time left to consume the credit — near expiry it's cheap, at expiry it's worthless.</p>
          </div>
          <div className="step">
            <div className="no">03 — Buy</div>
            <h3>Acquire capacity at a discount</h3>
            <p>A verified buyer picks up the commitment below face value. If they can consume it in time, they capture the discount.</p>
          </div>
        </div>
      </div>

      <div className="band">
        <h2>Trust, minimized in layers</h2>
        <p className="lead">
          Sellers are identity-verified and revocable, and post a <b>collateral bond</b> that is slashed
          to compensate buyers on fraud. It's a real-world claim, so some trust in the provider is
          irreducible — we're honest about that, and reduce the rest on-chain.
        </p>
        <div className="home-cta">
          <button className="btn primary" onClick={onEnter}>Browse the market</button>
        </div>
      </div>
    </div>
  );
}
