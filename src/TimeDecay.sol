// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * @title TimeDecay
 * @notice The pricing core (SPEC §3, §5.3). A cloud commitment is not worth a constant amount: a
 *         buyer needs *time* to consume the credit, so the closer to expiry, the less it is worth,
 *         and its value converges to zero at expiry (the credit is lost if unconsumed).
 *
 *         We model the market value as a fraction of face value that scales with the time left to
 *         consume, capped at a full-value horizon:
 *
 *             factor(t) = min(t, horizon) / horizon      ∈ [0, 1]
 *             value(t)  = faceValue * factor(t)
 *
 *         - at expiry (t = 0): factor 0 → value 0.
 *         - with at least `horizon` seconds left: factor 1 → full face value.
 *         - in between: linear, monotonically decreasing as expiry approaches.
 *
 *         `horizon` is the time a buyer realistically needs to consume the whole commitment (a pool
 *         parameter). Factors are returned in basis points (1e4 = 100%) for on-chain price math.
 *
 *         This is deliberately simple and legible: no oracle, no exp(); the value moves *mechanically*
 *         with block time, which is exactly what the demo shows (advance time → price changes with no
 *         human action).
 */
library TimeDecay {
    uint256 internal constant BIPS = 10_000;

    /// @notice Decay factor in basis points for `secondsToExpiry` given a full-value `horizonSeconds`.
    /// @return factorBips value in [0, 10000]; 0 at/after expiry, 10000 once ≥ horizon remains.
    function factorBips(uint256 secondsToExpiry, uint256 horizonSeconds)
        internal
        pure
        returns (uint256)
    {
        if (horizonSeconds == 0) return BIPS; // no decay configured → full value
        uint256 t = secondsToExpiry > horizonSeconds ? horizonSeconds : secondsToExpiry;
        return (t * BIPS) / horizonSeconds;
    }

    /// @notice Discounted market value of `faceValue` given time left and horizon.
    function discountedValue(uint256 faceValue, uint256 secondsToExpiry, uint256 horizonSeconds)
        internal
        pure
        returns (uint256)
    {
        return (faceValue * factorBips(secondsToExpiry, horizonSeconds)) / BIPS;
    }

    /// @notice Seconds left before `expiry` at time `nowTs`; 0 once expired.
    function secondsToExpiry(uint64 expiry, uint256 nowTs) internal pure returns (uint256) {
        return nowTs >= expiry ? 0 : uint256(expiry) - nowTs;
    }
}
