import { addr, pool } from "./config";

const MIN_SQRT = 4295128739n + 1n;
const MAX_SQRT = 1461446703485210103287273052203988822378723970342n - 1n;

/** The pool key as a tuple for router.swap. token is currency0 (token address < usdc). */
export function poolKey() {
  const c0 = pool.tokenIsCurrency0 ? addr.token : addr.usdc;
  const c1 = pool.tokenIsCurrency0 ? addr.usdc : addr.token;
  return { currency0: c0 as `0x${string}`, currency1: c1 as `0x${string}`, fee: pool.fee, tickSpacing: pool.tickSpacing, hooks: addr.hook as `0x${string}` };
}

/** Build router.swap args for buying ACME with `usdcIn` (6dp), exact-input. */
export function buildBuy(usdcIn: bigint) {
  // input = USDC. zeroForOne is true iff USDC is currency0.
  const zeroForOne = !pool.tokenIsCurrency0;
  return [
    poolKey(),
    { zeroForOne, amountSpecified: -usdcIn, sqrtPriceLimitX96: zeroForOne ? MIN_SQRT : MAX_SQRT },
  ] as const;
}

/** Build router.swap args for selling `tokenIn` ACME for USDC, exact-input. */
export function buildSell(tokenIn: bigint) {
  const zeroForOne = pool.tokenIsCurrency0; // input = token
  return [
    poolKey(),
    { zeroForOne, amountSpecified: -tokenIn, sqrtPriceLimitX96: zeroForOne ? MIN_SQRT : MAX_SQRT },
  ] as const;
}
