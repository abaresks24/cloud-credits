# Deployments — Sepolia (11155111)

Deployed 2026-09-06 via `script/Deploy.s.sol`. A conformant buy was executed in the same broadcast
and verified on-chain (see below).

## Ours

| Contract | Address | Role |
|---|---|---|
| CommitmentToken (ccAWS) | `0x607840F8fC994228F407dAeDe17ce52f0f85C770` | $100k AWS commitment, 24-month expiry, 6dp |
| CommitmentResolver | `0x0286F6e5939b58Bf895C75826d4286Bf94731Fa4` | ENSIP text resolver + EAC roles (issuer/verifier) |
| EnsSellerRegistry | `0x94E8D7225D39FCc31Dc41bdD840D047f74317060` | reads `commitment.status`; eligibility = active |
| EnsEligibilityAdapter | `0x97e0c5DF3E110bD57961396E53Eba638D7cbACcA` | address → ENS node → eligibility (hook's oracle) |
| **TimeDecayHook** | `0x336491F60Cb6aF7061d7112f2475067821238888` | v4 custom-curve hook; low bits `0x888` = flags |
| CommitmentRouter | `0xF20af8371B4dBa71562399607d18bb05FAB8A682` | dedicated router (RISK #1: forwards real user) |

## Reused (pinned + verified — see `addresses.ts`)

| Contract | Address |
|---|---|
| Uniswap v4 PoolManager | `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543` |
| MockUSDC (payment + pool USDC, mintable 6dp) | `0x768f42455a2d082e23ceef7d51e5787c82d67a39` |
| ENS name | `cloudcredits.eth` (node `0xfc47d166…c78b`) |

Dev wallet: `0xc46809Db4e041156a9000d177f5b8cE45405Fa69`.

## On-chain verification (post-deploy `cast`)

- `hook.allowedRouter(router)` → `true`
- `adapter.isEligible(dev)` → `true` (ENS-backed, via cloudcredits.eth → status active)
- `hook.currentFactorBips()` → `9999` (already decaying from full value)
- ACME balance of dev → `51000.10` (minted 100k − seeded 50k + bought ~1000.1) → **the conformant buy landed**

## Notes

- The pool is reachable only through `CommitmentRouter` (the venue router); direct PoolManager access
  is rejected by the hook (`UnauthorizedRouter`). Concentrated liquidity is disabled
  (`beforeAddLiquidity` reverts); reserves are held by the hook as ERC-6909 claims and seeded via
  `seedLiquidity` (LP-eligibility gated).
- The hook address was mined with `HookMiner` so its low 14 bits carry the permission flags
  (BEFORE_SWAP | BEFORE_SWAP_RETURNS_DELTA | BEFORE_ADD_LIQUIDITY), then deployed via CREATE2.
