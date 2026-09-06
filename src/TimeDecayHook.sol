// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {BaseTestHooks} from "v4-core/src/test/BaseTestHooks.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {BeforeSwapDelta, toBeforeSwapDelta} from "v4-core/src/types/BeforeSwapDelta.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {CurrencySettler} from "v4-core/test/utils/CurrencySettler.sol";
import {IUnlockCallback} from "v4-core/src/interfaces/callback/IUnlockCallback.sol";

import {IEligibility} from "./IEligibility.sol";
import {CommitmentToken} from "./CommitmentToken.sol";
import {TimeDecay} from "./TimeDecay.sol";

/**
 * @title TimeDecayHook
 * @notice The core (SPEC §5.3). A Uniswap v4 hook that makes a CommitmentToken/USDC pool price in
 *         the time left before the commitment expires — a "custom curve" (chemin A): `beforeSwap`
 *         absorbs the whole swap and settles it at the decayed rate, no-oping concentrated liquidity.
 *
 *         Exchange rate: 1 CommitmentToken = `factor` USDC, where
 *             factor = TimeDecay.factorBips(timeToExpiry, horizon) / 1e4   ∈ [0, 1]
 *         Both tokens use 6 decimals, so at full value 1 token ≈ 1 USDC, decaying to 0 at expiry.
 *         The rate moves mechanically with block time — the demo advances time and the price changes
 *         with no human action.
 *
 *         RISK #1 (SPEC §5.3): v4 passes the hook the *caller* (the router), not the end user. A naive
 *         hook that trusts `sender` gates nothing. Here the hook (a) accepts calls only from an
 *         allow-listed router, and (b) reads the real user forwarded in `hookData` and checks it
 *         against the eligibility oracle. An ineligible user is rejected even through an eligible
 *         router — proven by TimeDecayHook.t.sol.
 *
 *         Liquidity: the hook is the counterparty (holds reserves). Concentrated liquidity is disabled
 *         (`beforeAddLiquidity` reverts); an eligible LP seeds reserves via `seedLiquidity`.
 */
contract TimeDecayHook is BaseTestHooks, IUnlockCallback {
    using CurrencySettler for Currency;

    IPoolManager public immutable manager;
    IEligibility public immutable eligibility;
    CommitmentToken public immutable token; // the commitment side
    Currency public immutable tokenCurrency;
    Currency public immutable usdcCurrency;
    uint256 public immutable horizon; // seconds of runway for full value

    address public owner;
    mapping(address => bool) public allowedRouter;

    error NotPoolManager();
    error NotOwner();
    error UnauthorizedRouter(address sender);
    error NotEligible(address user);
    error TradingClosed(); // decayed to zero (expired)
    error ExactOutputNotSupported();
    error LiquidityViaHookOnly();

    event RouterAllowed(address indexed router, bool allowed);
    event Priced(address indexed user, bool buyingToken, uint256 inAmount, uint256 outAmount, uint256 factorBips);

    modifier onlyManager() {
        if (msg.sender != address(manager)) revert NotPoolManager();
        _;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(
        IPoolManager _manager,
        IEligibility _eligibility,
        CommitmentToken _token,
        Currency _usdc,
        uint256 _horizon
    ) {
        manager = _manager;
        eligibility = _eligibility;
        token = _token;
        tokenCurrency = Currency.wrap(address(_token));
        usdcCurrency = _usdc;
        horizon = _horizon;
        owner = msg.sender;
    }

    function setRouter(address router, bool allowed) external onlyOwner {
        allowedRouter[router] = allowed;
        emit RouterAllowed(router, allowed);
    }

    /// @notice Current decay factor in basis points (0..1e4); the price = factor/1e4 USDC per token.
    function currentFactorBips() public view returns (uint256) {
        return TimeDecay.factorBips(TimeDecay.secondsToExpiry(token.expiry(), block.timestamp), horizon);
    }

    /// @notice Seed the hook's reserves, held as ERC-6909 claims in the PoolManager. Gated on LP
    ///         eligibility (RISK #1 applies to LPs too: the LP is `msg.sender` here — they call the
    ///         hook directly, so there is no router to launder identity through). The LP must have
    ///         approved this hook for both ERC-20s.
    function seedLiquidity(uint256 tokenAmount, uint256 usdcAmount) external {
        if (!eligibility.isEligible(msg.sender)) revert NotEligible(msg.sender);
        manager.unlock(abi.encode(msg.sender, tokenAmount, usdcAmount));
    }

    /// @dev Only reached from `seedLiquidity`: deposit the LP's ERC-20 into the manager and mint the
    ///      equivalent ERC-6909 claims to this hook (its reserves for the custom curve).
    function unlockCallback(bytes calldata data) external returns (bytes memory) {
        if (msg.sender != address(manager)) revert NotPoolManager();
        (address lp, uint256 tokenAmount, uint256 usdcAmount) = abi.decode(data, (address, uint256, uint256));
        if (tokenAmount > 0) {
            tokenCurrency.settle(manager, lp, tokenAmount, false); // LP pays ERC-20 in
            tokenCurrency.take(manager, address(this), tokenAmount, true); // hook takes 6909 claims
        }
        if (usdcAmount > 0) {
            usdcCurrency.settle(manager, lp, usdcAmount, false);
            usdcCurrency.take(manager, address(this), usdcAmount, true);
        }
        return "";
    }

    // --- hook callbacks ---

    /// @dev Concentrated liquidity is disabled; the hook is the market maker. This also blocks the
    ///      default add-liquidity path entirely (fail-closed), satisfying the LP gate.
    function beforeAddLiquidity(
        address,
        PoolKey calldata,
        IPoolManager.ModifyLiquidityParams calldata,
        bytes calldata
    ) external view override onlyManager returns (bytes4) {
        revert LiquidityViaHookOnly();
    }

    function beforeSwap(
        address sender,
        PoolKey calldata key,
        IPoolManager.SwapParams calldata params,
        bytes calldata hookData
    ) external override onlyManager returns (bytes4, BeforeSwapDelta, uint24) {
        // RISK #1: only an allow-listed router may route, and the *real* user is read from hookData —
        // never from `sender` (which is the router).
        if (!allowedRouter[sender]) revert UnauthorizedRouter(sender);
        address user = abi.decode(hookData, (address));
        if (!eligibility.isEligible(user)) revert NotEligible(user);

        if (params.amountSpecified > 0) revert ExactOutputNotSupported(); // exact-input only

        uint256 factor = currentFactorBips();
        if (factor == 0) revert TradingClosed();

        (Currency inputCurrency, Currency outputCurrency) =
            params.zeroForOne ? (key.currency0, key.currency1) : (key.currency1, key.currency0);

        uint256 inAmount = uint256(-params.amountSpecified);
        bool buyingToken = Currency.unwrap(inputCurrency) == Currency.unwrap(usdcCurrency);

        // price at factor USDC per token (6dp both sides)
        uint256 outAmount = buyingToken
            ? (inAmount * TimeDecay.BIPS) / factor // USDC in -> token out (cheaper near expiry)
            : (inAmount * factor) / TimeDecay.BIPS; // token in -> USDC out (less near expiry)

        // hook is the counterparty, holding reserves as ERC-6909 claims:
        // take the input in as claims, pay the output out of its claim reserves.
        inputCurrency.take(manager, address(this), inAmount, true);
        outputCurrency.settle(manager, address(this), outAmount, true);

        emit Priced(user, buyingToken, inAmount, outAmount, factor);

        // no-op the concentrated-liquidity swap: cancel the specified amount, provide the counter amount
        BeforeSwapDelta delta = toBeforeSwapDelta(int128(-params.amountSpecified), -int128(int256(outAmount)));
        return (IHooks.beforeSwap.selector, delta, 0);
    }
}
