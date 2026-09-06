// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IUnlockCallback} from "v4-core/src/interfaces/callback/IUnlockCallback.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {BalanceDelta} from "v4-core/src/types/BalanceDelta.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {CurrencySettler} from "v4-core/test/utils/CurrencySettler.sol";

/**
 * @title CommitmentRouter
 * @notice The venue's dedicated swap router — the answer to RISK #1 (SPEC §5.3). Uniswap v4 passes the
 *         hook the *caller* of `swap`, which for any normal router is the router itself, not the end
 *         user. So this router authenticates the user and forwards it to the hook as `hookData`: it
 *         sets `hookData = abi.encode(msg.sender)` from its OWN caller, which cannot be forged by a
 *         third party (only the real caller's address is ever forwarded). The hook then checks that
 *         forwarded user, and only accepts calls from this allow-listed router.
 *
 *         Consequence: an ineligible user's swap reverts even though it flows through an eligible
 *         (allow-listed) router, and no one can bypass the check by calling the PoolManager directly.
 */
contract CommitmentRouter is IUnlockCallback {
    using CurrencySettler for Currency;

    IPoolManager public immutable manager;

    error NotManager();

    struct Callback {
        address user;
        PoolKey key;
        IPoolManager.SwapParams params;
    }

    constructor(IPoolManager _manager) {
        manager = _manager;
    }

    /// @notice Swap on behalf of `msg.sender`; the caller must have approved this router for the input.
    function swap(PoolKey calldata key, IPoolManager.SwapParams calldata params)
        external
        returns (BalanceDelta delta)
    {
        delta = abi.decode(manager.unlock(abi.encode(Callback(msg.sender, key, params))), (BalanceDelta));
    }

    function unlockCallback(bytes calldata raw) external returns (bytes memory) {
        if (msg.sender != address(manager)) revert NotManager();
        Callback memory d = abi.decode(raw, (Callback));

        // The user's identity is forwarded to the hook here — authenticated, not caller-supplied.
        BalanceDelta delta = manager.swap(d.key, d.params, abi.encode(d.user));

        int256 d0 = delta.amount0();
        int256 d1 = delta.amount1();
        // pay debts from the user, send credits to the user
        if (d0 < 0) d.key.currency0.settle(manager, d.user, uint256(-d0), false);
        if (d1 < 0) d.key.currency1.settle(manager, d.user, uint256(-d1), false);
        if (d0 > 0) d.key.currency0.take(manager, d.user, uint256(d0), false);
        if (d1 > 0) d.key.currency1.take(manager, d.user, uint256(d1), false);

        return abi.encode(delta);
    }
}
