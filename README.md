# Cloud Credits — a secondary market for unconsumed cloud commitments

**Companies over-commit to multi-year cloud spend for the discounts, then leave capacity unused.
Cloud Credits lets them resell it — at a price that decays with the time left to consume the credit,
enforced by a Uniswap v4 hook.** Sellers are verified through an ENSv2 identity (revocable by a
delegated role) and a World Selfie Check.

> ETHGlobal submission. Single chain: **Sepolia (11155111)**. Tracks: Uniswap Foundation (Best
> Uniswap Stack Contribution), ENS (Best Use of ENSv2), World (Selfie Check).
> **Live demo:** https://cloud-credits-abaresks24s-projects.vercel.app

---

## The problem (with sources)

Enterprises sign multi-year spend commitments with AWS/GCP/Azure for large discounts, then needs
change — a project is cancelled, a team migrates, a forecast was too optimistic — and they pay for
capacity they'll never use. There is no liquid market to resell that commitment.

- **~29% of cloud spend is wasted** in 2026 (up from 27% in 2025), and a stated driver is
  **under-used commitment discounts** — Flexera *State of the Cloud*.
- **Fewer than half of organizations** use any given commitment-discount program per provider — Flexera.

Sources and exact figures: [`docs/market-sources.md`](./docs/market-sources.md).

## Why a hook (not a plain pool)

A commitment is **not worth a constant amount**: a $100k credit with two years left is worth more than
the same credit three months from expiry, because the buyer has less time to consume it — value → 0 at
expiry. A classic AMM treats all tokens in a pool as identical, so two commitments of equal face value
but different expiry would trade at the same price. A Uniswap v4 **hook** fixes this by pricing in the
time to expiry — which is what makes the hook *necessary*, not decorative.

## Architecture

| Component | Role | Ours / Reused |
|---|---|---|
| Uniswap v4 `PoolManager` | The AMM | Reused (pinned, verified) |
| **`TimeDecayHook`** | Custom-curve hook: prices by time-to-expiry; enforces eligibility | **Ours — the core** |
| **`CommitmentToken`** | ERC-20 per (provider, expiry) commitment | **Ours** |
| **`CommitmentRouter`** | Dedicated router (solves RISK #1: forwards the real user) | **Ours** |
| **`TimeDecay`** | Pure decay math (`min(t,horizon)/horizon`) | **Ours** |
| **`EnsSellerRegistry`** | Reads `commitment.status` from ENS; eligibility = active | **Ours** |
| **`CommitmentResolver`** | ENSIP text resolver + EAC roles (issuer / verifier) | **Ours** |
| **`EnsEligibilityAdapter`** | address → ENS node → eligibility (the hook's oracle) | **Ours** |
| **`SellerBond`** | Seller collateral, slashable on fraud → compensation pool | **Ours** |
| World Selfie Check | Human-authorizes-the-sale (anti-fraud) | Integrated (`frontend/`) |

## What to review (and where)

- **RISK #1 — does the hook check the *user* or the *router*?**
  `src/TimeDecayHook.sol` → `beforeSwap`: only allow-listed routers may call, and the real user is
  read from `hookData` (forwarded by `src/CommitmentRouter.sol` from *its* caller — unforgeable),
  never from `sender`. Proven by `test/TimeDecayHook.t.sol::test_RISK1_ineligibleUser_viaEligibleRouter_reverts`
  and `test_unauthorizedRouter_reverts`.
- **The custom curve** — `src/TimeDecayHook.sol` `beforeSwap` returns a `BeforeSwapDelta` that no-ops
  concentrated liquidity and settles the swap from the hook's ERC-6909 reserves at rate
  `factor = TimeDecay.factorBips(timeToExpiry, horizon)/1e4`.
- **Decay is mechanical** — `test/TimeDecayHook.t.sol::test_decay_sameUsdcBuysMoreNearExpiry` and the
  full story `test/DemoScenarios.t.sol` (advance 21 months → the price changes with no human action).
- **ENSv2 is central, not cosmetic** — `test/DemoScenarios.t.sol::test_step8_revocationViaEAC`: a
  delegated officer flips `commitment.status` → eligibility drops live and the name is never moved.

## Tests

```bash
git clone --recurse-submodules https://github.com/abaresks24/cloud-credits
cd cloud-credits
forge test          # 36 passing across 6 suites
```

| Suite | Covers |
|---|---|
| `TimeDecayHook.t.sol` (7) | RISK #1 blocking test, custom-curve buy, decay, unauthorized router, expired |
| `DemoScenarios.t.sol` (6) | SPEC §6 steps 4-8 end-to-end with real ENS eligibility + EAC revocation + bond |
| `SellerBond.t.sol` (6) | Deposit/min, cooldown withdraw, slash-only-arbiter → compensation pool |
| `TimeDecay.t.sol` (7) | Decay math incl. fuzz monotonicity |
| `EnsSellerRegistry.t.sol` (6) | Reads `commitment.status`, revocation, fail-closed |
| `EnsEligibilityAdapter.t.sol` (4) | address → node → status bridge |

## Deployments (Sepolia)

All addresses are pinned and **verified on-chain** — see [`addresses.ts`](./addresses.ts) (read from
the official Uniswap v4 and ENSv2 docs on 2026-09-06) and [`docs/DEPLOYMENTS.md`](./docs/DEPLOYMENTS.md)
(our contracts + a conformant buy executed and verified on-chain). Real ENS name: **`cloudcredits.eth`**,
registered via the ENSv2 beta ETHRegistrar.

## Anticipating the judges

- **"Are these commitments legally transferable?"** Honestly: cloud contracts restrict assignment; a
  real deployment would require provider consent. We don't hide this — it's the condition for
  industrialization, not a reason the mechanism doesn't work.
- **"Why a hook, not a classic pool?"** Without time decay the market systematically mis-prices:
  equal face value, different expiry → same price. See `TimeDecay` + the decay tests.
- **"Why ENS, not a `mapping(address => bool)`?"** Native expiry, per-role delegation (EAC — an
  officer can revoke without owning the name), rich attributes, and a **portable** identity other
  protocols can read permissionlessly. Only a lightweight `address → node` pointer is local; the
  decision attributes live in ENS.
- **"Is ENSv2 central?"** Yes — the revocation demo is a single ENS status write by a delegated role
  that changes on-chain trading behavior immediately.

## Trust model & path to trustlessness

This asset is a **real-world claim on AWS**, so you can never be more trustless than the party that
owes the service — the "last-mile / oracle problem" of RWAs. We don't pretend otherwise; we *reduce*
trust in layers:

- **Level 0 (identity)** — a desk attests and can revoke via a delegated ENS role. Reputational trust.
- **Level 1 (collateral) — implemented.** `SellerBond`: a seller must post a bond to list; on fraud the
  officer slashes it to a compensation pool, so a buyer is made whole on-chain. This replaces
  reputational trust with an **economic guarantee + automatic remedy**. Honest limit: it still needs a
  *trigger* (who declares fraud).
- **Level 2 (proofs) — future.** zkTLS/TLSNotary proofs of the AWS console balance would remove the
  trusted desk from steps "does it exist / is the value true".
- **Level 3 (native issuance)** — only AWS issuing transferable credits on-chain removes step "will it
  be honored" — and even then you trust AWS. That's the irreducible floor.

## Deliberate scope

Not built (out of scope): ERC-1155 multi-maturity, price oracle/index, cryptographic proof the
commitment really exists, multi-chain/agents. The pool is reachable only through the venue router
(a regulated venue is not meant to be enterable through any door) — direct PoolManager access is
rejected. Concentrated liquidity is disabled; the hook is the market maker (ERC-6909 reserves).

## ENSv2 beta notes

ENSv2 on Sepolia is a moving beta. We reverse-engineered the ETHRegistrar on-chain (commit-reveal,
priced in an ERC-20, not ETH). The beta's shared resolver rejects `setText` for fresh names, so we
serve `commitment.*` from our own ENSIP resolver (`CommitmentResolver`) that the name points to —
resolution stays ENS-native. Details in [`docs/prompts/`](./docs/prompts).

## Utilisation de l'IA

Développé avec Claude Code. Claude a écrit les contrats, les tests, le script de déploiement et le
frontend, et a reverse-engineeré l'interface ENSv2 beta on-chain. Chaque décision d'architecture
(chemin A vs B pour le hook, motif CSMM ERC-6909, résolveur maison face à la beta) a été arbitrée
puis validée par l'humain (règle d'acceptation : aucun fichier mergé sans pouvoir énoncer ce qu'il
fait et pourquoi). Le journal des décisions/prompts est dans [`docs/prompts/`](./docs/prompts).
