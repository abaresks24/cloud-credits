"use client";

import Link from "next/link";
import { addr } from "@/lib/config";
import { Footer } from "@/components/Footer";
import { Logo } from "@/components/Brand";

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
const scan = (a: string) => `https://sepolia.etherscan.io/address/${a}`;

const CONTRACTS: { name: string; role: string; a: string }[] = [
  { name: "TimeDecayHook", role: "Uniswap v4 hook — prices the commitment by time to maturity", a: addr.hook },
  { name: "CommitmentToken", role: "The tokenized commitment (ccAWS)", a: addr.token },
  { name: "CommitmentRouter", role: "Venue router — forwards the real user to the hook", a: addr.router },
  { name: "EnsSellerRegistry", role: "Reads eligibility from ENS records", a: addr.registry },
  { name: "EnsEligibilityAdapter", role: "address → ENS node → eligibility (the hook's oracle)", a: addr.adapter },
  { name: "SellerBond", role: "Seller collateral, slashable on fraud", a: addr.bond },
];

export default function Docs() {
  return (
    <div className="wrap">
      <nav className="nav">
        <Link href="/" className="brand" style={{ textDecoration: "none" }}><Logo /> Tenor</Link>
        <Link href="/" className="btn primary">Launch app</Link>
      </nav>

      <div style={{ paddingTop: 44 }}>
        <h1 className="doc-title">Documentation</h1>
        <p className="doc-intro">What Tenor is, how the price works, and how to use it.</p>
      </div>

      <div className="doc-wrap">
        <aside className="toc">
          <a href="#overview">Overview</a>
          <a href="#problem">The problem</a>
          <a href="#pricing">How the price works</a>
          <a href="#identity">Identity &amp; trust</a>
          <a href="#using">Using the app</a>
          <a href="#contracts">Contracts</a>
          <a href="#limits">Honest limits</a>
        </aside>

        <article className="doc">
          <h2 id="overview">Overview</h2>
          <p>
            Tenor is a marketplace for <b>unused cloud spend commitments</b>. Companies pre-pay
            for years of AWS, Google Cloud or Azure to unlock discounts, then leave much of that capacity
            unused. Tenor lets them resell it to a company that needs it — at a price that reflects
            how much time is left to consume the credit.
          </p>
          <p>
            It runs on a <b>Uniswap v4 pool</b>. What makes it work is a custom <b>hook</b> that prices the
            asset by its <b>time to maturity</b>, plus an identity layer (<b>ENS</b> + <b>World</b>) and a
            seller <b>collateral bond</b>.
          </p>

          <h2 id="problem">The problem</h2>
          <p>Cloud commitments waste money at scale, and there's nowhere to resell them:</p>
          <ul>
            <li><b>~29%</b> of cloud spend is wasted in 2026 (Flexera <i>State of the Cloud</i>).</li>
            <li><b>Fewer than half</b> of organizations fully use any given commitment-discount program.</li>
            <li>There is <b>no liquid market</b> to offload what you won't consume.</li>
          </ul>

          <h2 id="pricing">How the price works</h2>
          <p>
            A commitment is <b>not worth a constant amount</b>. A $100k credit with two years left is worth
            more than the same credit three months from expiry — the buyer has less time to consume it. At
            expiry the unconsumed credit is lost, so its value goes to <b>zero</b>.
          </p>
          <p>A normal AMM can't express this — it treats all tokens as identical. The v4 hook sets:</p>
          <div className="callout">
            price = face value × <b>min(time left, horizon) / horizon</b>
            <br />→ full value with time to spare · a growing discount as expiry nears · zero at expiry.
          </div>
          <p>
            The price moves <b>mechanically with block time</b> — no human, no oracle. On the Market page,
            the <b>discount to face</b> is the deal a buyer captures if they can consume the credit in time.
          </p>

          <h2 id="identity">Identity &amp; trust</h2>
          <p>
            Because this is a <b>real-world claim</b> (a contract with AWS), the market can't be fully
            anonymous — a fraudulent listing must be removable, and a buyer must be an entity that can
            actually use the credit. So participation is gated:
          </p>
          <ul>
            <li><b>World Selfie Check</b> — proves a real human authorizes the sale (anti-fraud, not KYC).</li>
            <li><b>ENS identity</b> — a portable, revocable credential. A delegated compliance role can flip
              <code>commitment.status</code> to <code>revoked</code> and eligibility drops live, without ever
              moving the name.</li>
            <li><b>Seller bond</b> — a seller posts collateral to list; on fraud it's <b>slashed</b> to a
              compensation pool, so a buyer is made whole on-chain. This replaces reputational trust with an
              economic guarantee.</li>
          </ul>
          <p>
            Honest limit: you can never be more trustless than AWS, the party that owes the service. We
            reduce trust in layers (identity → collateral → future zk proofs of the credit balance) but the
            last mile is irreducible.
          </p>

          <h2 id="using">Using the app</h2>
          <h3>Buy</h3>
          <p>
            On <b>Market</b>, connect a verified wallet, get test USDC, approve the router, and buy ccAWS.
            You pay USDC; the amount of ccAWS you receive reflects the current decayed price.
          </p>
          <h3>Sell</h3>
          <p>
            On <b>Sell</b>, complete World Selfie Check. On a valid proof the desk issues your ENS subname
            and records, and your commitment becomes tradable.
          </p>
          <h3>Desk</h3>
          <p>
            The <b>Desk</b> is the issuer/compliance surface: onboard an address, or revoke/reactivate a
            credential. Revocation is a single ENS status write by a delegated role.
          </p>

          <h2 id="contracts">Contracts</h2>
          <p>Deployed on Ethereum Sepolia (11155111). Payment/test token: MockUSDC (mintable, 6 decimals).</p>
          <table className="doc-table">
            <thead><tr><th>Contract</th><th>Role</th><th>Address</th></tr></thead>
            <tbody>
              {CONTRACTS.map((c) => (
                <tr key={c.name}>
                  <td>{c.name}</td>
                  <td>{c.role}</td>
                  <td className="mono"><a href={scan(c.a)} target="_blank" rel="noreferrer">{short(c.a)}</a></td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 id="limits">Honest limits</h2>
          <ul>
            <li><b>Testnet + demo asset.</b> ccAWS is not a real security.</li>
            <li><b>Legal transferability.</b> Cloud contracts restrict assignment; a real deployment would
              need provider consent. We assume and explain this rather than hide it.</li>
            <li>The pool is reachable only through the venue router by design; direct access is rejected.</li>
          </ul>
        </article>
      </div>

      <Footer />
    </div>
  );
}
