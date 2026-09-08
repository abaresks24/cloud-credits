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
import {CommitmentResolver} from "../src/CommitmentResolver.sol";
import {EnsSellerRegistry} from "../src/EnsSellerRegistry.sol";
import {EnsEligibilityAdapter} from "../src/EnsEligibilityAdapter.sol";
import {SellerBond} from "../src/SellerBond.sol";

contract USDCMock is ERC20 {
    constructor() ERC20("USDC", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 a) external { _mint(to, a); }
}

/**
 * Replays the SPEC §6 demo end-to-end with the REAL ENS-backed eligibility (resolver + registry +
 * adapter), so the revocation step (8) is a genuine ENS status flip by a delegated role.
 */
contract DemoScenariosTest is Test, Deployers {
    uint256 constant HORIZON = 730 days;

    TimeDecayHook hook;
    CommitmentToken token;
    USDCMock usdc;
    CommitmentResolver resolver;
    EnsSellerRegistry registry;
    EnsEligibilityAdapter adapter;
    CommitmentRouter router;
    SellerBond bond;

    address pool = makeAddr("compensationPool");
    uint256 constant MIN_BOND = 50_000e6;

    address desk = address(this); // issuer / compliance desk
    address officer = makeAddr("officer"); // delegated verifier (EAC role)
    address alice = makeAddr("alice"); // verified buyer
    address alice2 = makeAddr("alice2"); // verified buyer (for the time step)
    address bob = makeAddr("bob"); // unverified buyer
    address lp = makeAddr("lp");

    bytes32 constant ALICE_NODE = keccak256("alice.cloudcredits.eth");
    bytes32 constant ALICE2_NODE = keccak256("alice2.cloudcredits.eth");

    function setUp() public {
        deployFreshManagerAndRouters();
        usdc = new USDCMock();

        resolver = new CommitmentResolver();
        registry = new EnsSellerRegistry(address(resolver));
        adapter = new EnsEligibilityAdapter(address(registry));
        resolver.setVerifier(officer, true); // delegate the verification role
        bond = new SellerBond(address(usdc), MIN_BOND, 1 days, officer, pool); // officer is also the arbiter

        token = new CommitmentToken(CommitmentToken.Provider.AWS, 100_000, uint64(block.timestamp + 730 days), lp);

        uint160 flags =
            uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG);
        address hookAddr = address((uint160(0x4444) << 144) | flags);
        Currency usdcCur = Currency.wrap(address(usdc));
        deployCodeTo(
            "TimeDecayHook.sol:TimeDecayHook",
            abi.encode(IPoolManager(address(manager)), adapter, token, usdcCur, HORIZON, address(this), address(bond)),
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

        // eligible LP posts a bond, then seeds reserves
        _onboard(keccak256("lp.cloudcredits.eth"), lp);
        usdc.mint(lp, 1_000_000e6);
        vm.startPrank(lp);
        usdc.approve(address(bond), type(uint256).max);
        bond.deposit(MIN_BOND); // skin in the game before listing
        token.approve(address(hook), type(uint256).max);
        usdc.approve(address(hook), type(uint256).max);
        hook.seedLiquidity(60_000e6, 400_000e6);
        vm.stopPrank();

        // verified buyers
        _onboard(ALICE_NODE, alice);
        _onboard(ALICE2_NODE, alice2);
        usdc.mint(alice, 100_000e6);
        usdc.mint(alice2, 100_000e6);
        usdc.mint(bob, 100_000e6);
    }

    function _onboard(bytes32 node, address who) internal {
        resolver.onboard(node, "aws", "attested", uint64(block.timestamp + 730 days));
        adapter.bind(who, node);
    }

    function _buyParams(uint256 usdcIn) internal view returns (IPoolManager.SwapParams memory) {
        bool zfo = Currency.unwrap(key.currency0) == address(usdc);
        return IPoolManager.SwapParams({
            zeroForOne: zfo,
            amountSpecified: -int256(usdcIn),
            sqrtPriceLimitX96: zfo ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
        });
    }

    function _buy(address who, uint256 usdcIn) internal returns (uint256 got) {
        uint256 before = token.balanceOf(who);
        vm.startPrank(who);
        usdc.approve(address(router), type(uint256).max);
        router.swap(key, _buyParams(usdcIn));
        vm.stopPrank();
        got = token.balanceOf(who) - before;
    }

    // §6 step 4 — a verified buyer buys; the price reflects the (current) decay.
    function test_step4_verifiedBuyerBuys() public {
        assertGt(_buy(alice, 1_000e6), 0);
    }

    // §6 steps 5-6 — advance 21 months; the same USDC now buys more (price changed mechanically).
    function test_step5and6_priceChangesWithTime() public {
        uint256 outNow = _buy(alice, 1_000e6);
        vm.warp(block.timestamp + 640 days); // ~90 days left
        uint256 outLater = _buy(alice2, 1_000e6);
        assertGt(outLater, outNow);
    }

    // §6 step 7 — an unverified buyer is rejected (no ENS identity → not eligible).
    function test_step7_unverifiedBuyerRejected() public {
        vm.startPrank(bob);
        usdc.approve(address(router), type(uint256).max);
        vm.expectRevert(); // hook reverts NotEligible (wrapped by the manager)
        router.swap(key, _buyParams(1_000e6));
        vm.stopPrank();
        assertFalse(adapter.isEligible(bob), "bob has no ENS identity");
    }

    // §6 step 8 — the delegated officer flips commitment.status to revoked; the resale then fails,
    // eligibility drops live, and the ENS name is never moved or deleted.
    function test_step8_revocationViaEAC() public {
        assertGt(_buy(alice, 1_000e6), 0); // alice can trade while active

        vm.prank(officer);
        resolver.setStatus(ALICE_NODE, "revoked"); // single status write by the delegated role

        assertFalse(adapter.isEligible(alice), "revoked seller is ineligible");
        // the binding (the name pointer) is untouched — only status changed
        assertEq(adapter.nodeOf(alice), ALICE_NODE);

        vm.startPrank(alice);
        vm.expectRevert(); // resale now rejected at the hook
        router.swap(key, _buyParams(1_000e6));
        vm.stopPrank();
    }

    // Trust-minimization: a seller must be bonded to list — ENS-active alone is not enough.
    function test_bond_requiredToList() public {
        address seller2 = makeAddr("seller2");
        _onboard(keccak256("seller2.cloudcredits.eth"), seller2); // ENS active, but no bond posted
        assertTrue(adapter.isEligible(seller2), "ENS-eligible");
        vm.prank(seller2);
        vm.expectRevert(abi.encodeWithSelector(TimeDecayHook.NotBonded.selector, seller2));
        hook.seedLiquidity(0, 1_000e6);
    }

    // Fraud path: the officer slashes the seller's bond to the compensation pool (buyer made whole
    // on-chain), on top of revoking their ENS status.
    function test_bond_slashCompensatesOnFraud() public {
        assertTrue(bond.hasBond(lp));
        uint256 poolBefore = usdc.balanceOf(pool);

        vm.startPrank(officer);
        resolver.setStatus(keccak256("lp.cloudcredits.eth"), "revoked"); // revoke identity
        bond.slash(lp); // and slash the bond
        vm.stopPrank();

        assertEq(usdc.balanceOf(pool), poolBefore + MIN_BOND, "compensation pool funded by the slash");
        assertFalse(bond.hasBond(lp), "bond gone");
        assertFalse(adapter.isEligible(lp), "identity revoked too");
    }
}
