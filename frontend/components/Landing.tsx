"use client";

import Link from "next/link";

export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="video-hero">
      <video className="hero-video" autoPlay muted loop playsInline preload="auto">
        <source src="/hero.mp4" type="video/mp4" />
      </video>
      <div className="hero-overlay" />

      <div className="hero-inner">
        <nav className="hero-nav">
          <div className="brand"><span className="logo">C</span> Cloud Credits</div>
          <div className="hero-nav-right">
            <Link className="hero-link" href="/docs">Docs</Link>
            <button className="btn on-video" onClick={onEnter}>Launch app</button>
          </div>
        </nav>

        <main className="hero-copy">
          <h1>Unused cloud commitments, made liquid.</h1>
          <p>
            Companies pre-pay years of AWS, Google Cloud and Azure to unlock discounts — then leave
            much of it unused. Cloud Credits is where they resell that capacity, priced by the time
            left to consume the credit.
          </p>
          <div className="hero-cta">
            <button className="btn on-video lg" onClick={onEnter}>Launch app</button>
            <Link className="btn on-video-ghost lg" href="/docs">Read the docs</Link>
          </div>
        </main>

        <footer className="hero-foot">
          <span>© Cloud Credits</span>
          <div>
            <a href="https://github.com/abaresks24/cloud-credits" target="_blank" rel="noreferrer">GitHub</a>
            <a href="https://x.com/abaresks" target="_blank" rel="noreferrer">Twitter</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
