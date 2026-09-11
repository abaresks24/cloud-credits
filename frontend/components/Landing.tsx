"use client";

import Link from "next/link";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Brand";

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <>
      {/* cinematic city hero */}
      <div className="video-hero">
        <video className="hero-video" autoPlay muted loop playsInline preload="auto">
          <source src="/hero.mp4" type="video/mp4" />
        </video>
        <div className="hero-overlay" />
        <div className="hero-inner">
          <nav className="hero-nav">
            <div className="brand"><Logo /> Tenor</div>
            <div className="hero-nav-right">
              <Link className="hero-link" href="/docs">Docs</Link>
              <button className="btn on-video" onClick={onEnter}>Launch app</button>
            </div>
          </nav>
          <main className="hero-copy">
            <h1>Unused cloud commitments, made liquid.</h1>
            <p>
              Companies pre-pay years of AWS, Google Cloud and Azure to unlock discounts — then leave
              much of it unused. Tenor is where they resell that capacity, priced by the time
              left to consume the credit.
            </p>
            <div className="hero-cta">
              <button className="btn on-video lg" onClick={onEnter}>Launch app</button>
              <Link className="btn on-video-ghost lg" href="/docs">Read the docs</Link>
            </div>
          </main>
        </div>
      </div>

      {/* presentation of the protocol */}
      <div className="wrap">
        <section className="pres-sec">
          <div className="pres-eyebrow">The protocol</div>
          <h2>A market for capacity that would otherwise expire.</h2>
          <p className="lead">
            A cloud commitment isn't a fixed sum — it's worth less the closer it gets to expiry, because
            there's less time to consume it, and nothing at all once it lapses. Tenor turns that
            wasting asset into something a company can sell today, and another can buy at a discount.
          </p>
        </section>

        <section className="pres-sec">
          <div className="pres-eyebrow">How it works</div>
          <h2>Sell, price, buy — on-chain.</h2>
          <div className="steps">
            <div className="step">
              <div className="no">01 — List</div>
              <h3>Tokenize what you won't use</h3>
              <p>A verified seller tokenizes their commitment. It goes on the market instantly, no OTC deal, no waiting.</p>
            </div>
            <div className="step">
              <div className="no">02 — Price</div>
              <h3>The discount tracks maturity</h3>
              <p>A Uniswap v4 hook sets the price from the time left to consume the credit — the discount widens mechanically as expiry nears.</p>
            </div>
            <div className="step">
              <div className="no">03 — Buy</div>
              <h3>Acquire capacity below face value</h3>
              <p>A verified buyer picks it up at a discount and captures it if they consume the credit before it expires.</p>
            </div>
          </div>
        </section>

        <section className="pres-sec">
          <div className="pres-eyebrow">Trust, minimized in layers</div>
          <h2>Verified sellers. Real skin in the game.</h2>
          <p className="lead">
            It's a real-world claim, so the market can't be anonymous — it has to be able to remove bad
            actors and make buyers whole. Three layers do that.
          </p>
          <div className="feat-grid">
            <div className="feat">
              <h3>Proof of human</h3>
              <p>World Selfie Check proves a real person authorizes the sale — an anti-fraud signal, not KYC.</p>
            </div>
            <div className="feat">
              <h3>Revocable identity</h3>
              <p>Eligibility is an ENS credential a delegated compliance role can revoke live — without ever moving the name.</p>
            </div>
            <div className="feat">
              <h3>Collateral bond</h3>
              <p>Sellers post a bond that is slashed to a compensation pool on fraud, so a buyer is made whole on-chain.</p>
            </div>
          </div>
        </section>

        <section className="pres-sec">
          <div className="pres-eyebrow">Built on</div>
          <div className="builton">
            <span>Uniswap v4 <i>· the time-decay hook</i></span>
            <span>ENSv2 <i>· portable, revocable identity</i></span>
            <span>World <i>· proof of human</i></span>
          </div>
        </section>

        <section className="cta-band">
          <h2>See what's on the market.</h2>
          <p>Browse the live commitment, its discount, and the maturity curve.</p>
          <div className="home-cta">
            <button className="btn primary lg" onClick={onEnter}>Launch app</button>
            <Link className="btn lg" href="/docs">Read the docs</Link>
          </div>
        </section>

        <Footer />
      </div>
    </>
  );
}
