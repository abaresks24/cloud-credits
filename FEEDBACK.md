# Uniswap v4 — builder feedback

Honest feedback from building `TimeDecayHook`, a full custom-curve hook, during this hackathon.
Submit alongside the form at developers.uniswap.org/hackathon-feedback.

## What worked well
- **Custom curves via `beforeSwap` + `BeforeSwapDelta`** are genuinely powerful — we replaced the
  entire pricing curve with a time-decay function in a few lines. The `toBeforeSwapDelta(specified,
  unspecified)` mental model (cancel the specified amount, provide the counter amount) is elegant once
  it clicks.
- **CREATE2 + address-encoded permission flags** is clean; `HookMiner.find(...)` made mining the
  hook address (low bits = `BEFORE_SWAP | BEFORE_SWAP_RETURNS_DELTA | BEFORE_ADD_LIQUIDITY`)
  painless in a `forge script`.
- The v4-core test harness (`Deployers`, `PoolSwapTest`, `CurrencySettler`) made it possible to test
  a real swap through the manager quickly.

## Friction / suggestions
- **`BaseHook` is not in the installed `v4-periphery`** (only `src/base/*` utilities). We fell back to
  inheriting `BaseTestHooks` from v4-core (as the official `CustomCurveHook` example does) — but that
  is a *test* contract living under `src/test/`, which feels wrong to import into production `src/`.
  A canonical, non-test `BaseHook` in v4-periphery (with `getHookPermissions` + address validation)
  would remove this ambiguity. The docs point to it, but the package didn't ship it at the tag
  `forge install Uniswap/v4-periphery` resolved to.
- **The "hook holds reserves" custom-AMM case isn't obvious.** Our first attempt did
  `manager.take(input)` / `settle(output)` in ERC-20 and reverted `ERC20InsufficientBalance` because
  the PoolManager holds no reserves when concentrated liquidity is disabled. The working pattern —
  take/settle as **ERC-6909 claims** and seed reserves via `unlock` — is a CSMM idiom that deserves a
  first-class example in the docs next to `CustomCurveHook` (which quietly relies on pool liquidity).
- **Hook reverts are wrapped** by the PoolManager (`WrappedError(...)`), so `vm.expectRevert(MyError
  .selector)` doesn't match end-to-end; you must assert at the hook directly or use a bare
  `expectRevert()`. A documented note (or an unwrap helper in the test utils) would save time.
- **RISK #1 (sender = router, not user)** is the single biggest footgun. It would help to make it
  louder in the hook docs, with the `hookData`/dedicated-router pattern shown as the canonical fix and
  an acceptance test template.

## Our contribution
A pluggable, identity-gated custom-curve hook that prices a decaying real-world asset by time to
expiry, with the RISK #1 acceptance test included. See `src/TimeDecayHook.sol` and
`test/TimeDecayHook.t.sol`.
