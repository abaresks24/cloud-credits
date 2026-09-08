// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {Deployers} from "v4-core/test/utils/Deployers.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import {TimeDecayHook} from "../src/TimeDecayHook.sol";
import {CommitmentToken} from "../src/CommitmentToken.sol";
import {CommitmentRouter} from "../src/CommitmentRouter.sol";
import {IEligibility} from "../src/IEligibility.sol";

contract MintableUSDC is ERC20 {
    constructor() ERC20("Test USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amt) external {
        _mint(to, amt);
    }
}

contract MockEligibility is IEligibility {
    mapping(address => bool) public ok;

    function set(address u, bool v) external {
        ok[u] = v;
    }

    function isEligible(address u) external view returns (bool) {
        return ok[u];
    }
}

contract TimeDecayHookTest is Test, Deployers {
    uint256 constant HORIZON = 730 days;

    TimeDecayHook hook;
    CommitmentToken token;
    MintableUSDC usdc;
    MockEligibility elig;
    CommitmentRouter router;
    // `key` and `SQRT_PRICE_1_1` are inherited from Deployers.

    address lp = makeAddr("lp");
    address alice = makeAddr("alice"); // eligible buyer
    address alice2 = makeAddr("alice2"); // eligible buyer (2nd, for time test)
    address bob = makeAddr("bob"); // ineligible buyer

    function setUp() public {
        deployFreshManagerAndRouters();

        usdc = new MintableUSDC();
        elig = new MockEligibility();

        uint64 expiry = uint64(block.timestamp + 730 days);
        token = new CommitmentToken(CommitmentToken.Provider.AWS, 100_000, expiry, lp); // mints to lp

        // deploy hook at an address whose low 14 bits carry its permission flags
        uint160 flags =
            uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG);
        address hookAddr = address((uint160(0x4444) << 144) | flags);
        Currency usdcCur = Currency.wrap(address(usdc));
        deployCodeTo(
            "TimeDecayHook.sol:TimeDecayHook",
            abi.encode(IPoolManager(address(manager)), IEligibility(address(elig)), token, usdcCur, HORIZON, address(this), address(0)),
            hookAddr
        );
        hook = TimeDecayHook(hookAddr);

        router = new CommitmentRouter(IPoolManager(address(manager)));
        hook.setRouter(address(router), true);

        (Currency c0, Currency c1) = address(token) < address(usdc)
            ? (Currency.wrap(address(token)), usdcCur)
            : (usdcCur, Currency.wrap(address(token)));
        key = PoolKey({currency0: c0, currency1: c1, fee: 3000, tickSpacing: 60, hooks: IHooks(hookAddr)});
        manager.initialize(key, SQRT_PRICE_1_1);

        // eligible LP seeds the hook's reserves (concentrated liquidity is disabled)
        elig.set(lp, true);
        usdc.mint(lp, 1_000_000e6);
        vm.startPrank(lp);
        token.approve(address(hook), type(uint256).max);
        usdc.approve(address(hook), type(uint256).max);
        hook.seedLiquidity(50_000e6, 500_000e6); // 50k tokens + 500k USDC of reserves
        vm.stopPrank();

        elig.set(alice, true);
        elig.set(alice2, true);
        // bob deliberately NOT eligible
        usdc.mint(alice, 100_000e6);
        usdc.mint(alice2, 100_000e6);
        usdc.mint(bob, 100_000e6);
    }

    // ----- helpers -----

    function _buyParams(uint256 usdcIn) internal view returns (IPoolManager.SwapParams memory) {
        bool zeroForOne = Currency.unwrap(key.currency0) == address(usdc); // USDC is the input
        return IPoolManager.SwapParams({
            zeroForOne: zeroForOne,
            amountSpecified: -int256(usdcIn),
            sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
        });
    }

    function _buy(address user, uint256 usdcIn) internal returns (uint256 tokenOut) {
        uint256 before = token.balanceOf(user);
        vm.startPrank(user);
        usdc.approve(address(router), type(uint256).max);
        router.swap(key, _buyParams(usdcIn));
        vm.stopPrank();
        tokenOut = token.balanceOf(user) - before;
    }

    // ============ RISK #1 — the mandatory acceptance test (SPEC §5.3) ============

    /// The headline: with the SAME allow-listed router, the hook resolves the *real* user (from the
    /// router's forwarded hookData) and rejects an ineligible one. Asserted precisely at the hook.
    function test_RISK1_ineligibleUser_viaEligibleRouter_reverts() public {
        assertTrue(hook.allowedRouter(address(router)), "router is the eligible venue router");
        vm.prank(address(manager)); // beforeSwap is manager-only; call it exactly as the manager would
        vm.expectRevert(abi.encodeWithSelector(TimeDecayHook.NotEligible.selector, bob));
        hook.beforeSwap(address(router), key, _buyParams(1_000e6), abi.encode(bob));
    }

    /// Same thing end-to-end: bob's swap through the real router reverts (the manager wraps the
    /// hook's revert, so we assert that it reverts).
    function test_RISK1_ineligibleUser_e2e_reverts() public {
        vm.startPrank(bob);
        usdc.approve(address(router), type(uint256).max);
        vm.expectRevert();
        router.swap(key, _buyParams(1_000e6));
        vm.stopPrank();
    }

    /// Same router, eligible user → the swap succeeds and moves balances.
    function test_eligibleUser_viaRouter_succeeds() public {
        uint256 usdcBefore = usdc.balanceOf(alice);
        uint256 got = _buy(alice, 1_000e6);
        assertGt(got, 0, "alice should receive commitment tokens");
        assertEq(usdc.balanceOf(alice), usdcBefore - 1_000e6, "alice paid exactly the USDC input");
    }

    /// The pool cannot be entered except through the allow-listed router — even by an eligible user
    /// via a non-allow-listed router (no laundering, no direct PoolManager access).
    function test_unauthorizedRouter_reverts() public {
        address rogue = makeAddr("rogueRouter");
        vm.prank(address(manager));
        vm.expectRevert(abi.encodeWithSelector(TimeDecayHook.UnauthorizedRouter.selector, rogue));
        hook.beforeSwap(rogue, key, _buyParams(1_000e6), abi.encode(alice)); // alice eligible, router not
    }

    // ============ the hook's reason for existing: time decay ============

    /// Advancing time strictly changes the price with no human action: near expiry the same USDC buys
    /// more (cheaper) commitment tokens (SPEC §6 steps 5-6).
    function test_decay_sameUsdcBuysMoreNearExpiry() public {
        uint256 outNow = _buy(alice, 1_000e6); // ~730 days to expiry → factor ~1
        vm.warp(block.timestamp + 640 days); // ~90 days left → factor ~0.12
        uint256 outLater = _buy(alice2, 1_000e6);
        assertGt(outLater, outNow, "as expiry approaches, the token is cheaper: more per USDC");
    }

    function test_expired_tradingClosed() public {
        vm.warp(uint256(token.expiry()) + 1);
        vm.prank(address(manager));
        vm.expectRevert(TimeDecayHook.TradingClosed.selector);
        hook.beforeSwap(address(router), key, _buyParams(1_000e6), abi.encode(alice));
    }

    /// Concentrated liquidity is disabled — the default add-liquidity path is blocked (fail-closed).
    function test_directAddLiquidity_reverts() public {
        vm.expectRevert();
        modifyLiquidityRouter.modifyLiquidity(
            key,
            IPoolManager.ModifyLiquidityParams({tickLower: -60, tickUpper: 60, liquidityDelta: 1e18, salt: 0}),
            ""
        );
    }
}
