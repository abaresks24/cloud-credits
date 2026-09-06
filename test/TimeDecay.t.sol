// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {TimeDecay} from "../src/TimeDecay.sol";

/// J3 — the time-decay pricing core: value converges to zero at expiry, monotonically.
contract TimeDecayTest is Test {
    using TimeDecay for uint256;

    uint256 constant HORIZON = 730 days; // buyer needs ~2 years to consume the whole commitment

    function test_atExpiry_valueIsZero() public pure {
        assertEq(TimeDecay.factorBips(0, HORIZON), 0);
        assertEq(TimeDecay.discountedValue(100_000, 0, HORIZON), 0);
    }

    function test_fullHorizon_isFullValue() public pure {
        assertEq(TimeDecay.factorBips(HORIZON, HORIZON), 10_000);
        assertEq(TimeDecay.discountedValue(100_000, HORIZON, HORIZON), 100_000);
    }

    function test_beyondHorizon_isCappedAtFull() public pure {
        assertEq(TimeDecay.factorBips(HORIZON * 3, HORIZON), 10_000);
        assertEq(TimeDecay.discountedValue(100_000, HORIZON * 5, HORIZON), 100_000);
    }

    function test_halfway_isHalfValue() public pure {
        assertEq(TimeDecay.factorBips(HORIZON / 2, HORIZON), 5_000);
        assertEq(TimeDecay.discountedValue(100_000, HORIZON / 2, HORIZON), 50_000);
    }

    /// The demo's headline: advancing time strictly lowers the value (below the horizon).
    function test_monotonicDecreaseAsExpiryApproaches() public pure {
        uint256 prev = type(uint256).max;
        // walk from 2 years left down to 0, in monthly steps
        for (uint256 t = HORIZON; ; t -= 30 days) {
            uint256 v = TimeDecay.discountedValue(100_000e6, t, HORIZON);
            assertLe(v, prev, "value must not increase as time to expiry shrinks");
            prev = v;
            if (t < 30 days) break;
        }
        // near expiry the value is a small fraction of face
        assertLt(TimeDecay.discountedValue(100_000e6, 15 days, HORIZON), 100_000e6 / 40);
    }

    function test_secondsToExpiry() public pure {
        assertEq(TimeDecay.secondsToExpiry(1000, 400), 600);
        assertEq(TimeDecay.secondsToExpiry(1000, 1000), 0);
        assertEq(TimeDecay.secondsToExpiry(1000, 2000), 0);
    }

    /// Property: factor is monotonic non-decreasing in time-to-expiry.
    function testFuzz_monotonic(uint32 a, uint32 b) public pure {
        vm.assume(a <= b);
        assertLe(TimeDecay.factorBips(a, HORIZON), TimeDecay.factorBips(b, HORIZON));
    }
}
