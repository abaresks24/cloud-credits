# Deployments — Sepolia (11155111)

Deployed 2026-09-08 via `script/Deploy.s.sol`. A conformant buy was executed in the same broadcast
and verified on-chain. This deployment includes the **SellerBond** (collateral / trust-minimization).

## Ours

| Contract | Address | Role |
|---|---|---|
| CommitmentToken (ccAWS) | `0x4e9698256dC1654876086374B2B2655D97941280` | $100k AWS commitment, 24-month expiry, 6dp |
| CommitmentResolver | `0xD682c2f8C498A3B08C52E7c27891284Ab7A79dAe` | ENSIP text resolver + EAC roles (issuer/verifier) |
| EnsSellerRegistry | `0x05E00f06019DE4964314B6Ff727a098341c0f17a` | reads `commitment.status`; eligibility = active |
| EnsEligibilityAdapter | `0x4B909eE2C0c919D18b284177EE2830457E14818A` | address → ENS node → eligibility (hook's oracle) |
| **SellerBond** | `0x9a880f885445bAF769E98D57Dda814E3d6aADef4` | seller collateral; slashable on fraud → compensation pool |
| **TimeDecayHook** | `0xB5E5daeE51a2cbd5db6Fc021db0A091cac928888` | v4 custom-curve hook; low bits `0x888` = flags |
| CommitmentRouter | `0xc0363da931c198fab1533F2B1486d794A5931B6c` | dedicated router (RISK #1: forwards real user) |

## Reused (pinned + verified — see `addresses.ts`)

| Contract | Address |
|---|---|
| Uniswap v4 PoolManager | `0xE03A1074c86CFeDd5C142C4F04F1a1536e203543` |
| MockUSDC (payment + pool USDC + bond token, mintable 6dp) | `0x768f42455a2d082e23ceef7d51e5787c82d67a39` |
| ENS name | `cloudcredits.eth` (node `0xfc47d166…c78b`) |

Dev wallet: `0xc46809Db4e041156a9000d177f5b8cE45405Fa69`.

## On-chain verification (post-deploy `cast`)

- `hook.bond()` → the SellerBond address (bond wired into the hook's seller gate)
- `bond.hasBond(dev)` → `true` (dev posted a 50,000 USDC bond before seeding)
- `hook.allowedRouter(router)` → `true`
- `adapter.isEligible(dev)` → `true` (ENS-backed, via cloudcredits.eth → status active)
- ACME balance of dev grew by ~1,000 → **the conformant buy landed**

## Trust model (collateral)

To list a commitment, a seller must (1) be ENS-eligible (`commitment.status == active`) **and** (2) post
a bond in `SellerBond` (`seedLiquidity` reverts `NotBonded` otherwise). If the commitment turns out
fraudulent, the compliance officer both revokes the ENS status **and** slashes the bond to a
compensation pool — so a buyer is made whole on-chain. A clean exit requires `requestUnbond()` + a
cooldown, so a fraudster cannot withdraw before being caught. Honest boundary: the bond replaces
reputational trust with an economic guarantee, but still relies on a trigger (the officer / a future
challenge game) to declare fraud.

## Notes

- The pool is reachable only through `CommitmentRouter`; direct PoolManager access is rejected
  (`UnauthorizedRouter`). Concentrated liquidity is disabled; reserves are ERC-6909 claims seeded via
  `seedLiquidity`.
- The hook address was mined with `HookMiner` so its low 14 bits carry the permission flags, then
  deployed via CREATE2.
