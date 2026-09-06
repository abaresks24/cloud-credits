// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IEligibility} from "./IEligibility.sol";
import {EnsSellerRegistry} from "./EnsSellerRegistry.sol";

/**
 * @title EnsEligibilityAdapter
 * @notice Bridges the hook's address-based gate (IEligibility) to the ENS node-based
 *         EnsSellerRegistry. It holds the lightweight `address -> ENS node` pointer (the only local
 *         mapping — every decision *attribute* still lives in ENS, read live via the registry) and
 *         answers `isEligible(user) = registry.isEligibleSeller(nodeOf[user])`.
 *
 *         The binding is set by an admin (the compliance desk) at onboarding, alongside issuing the
 *         seller's ENS name. Fail-closed: an unbound address is never eligible.
 */
contract EnsEligibilityAdapter is IEligibility {
    EnsSellerRegistry public immutable registry;
    address public admin;

    mapping(address => bytes32) public nodeOf;

    event AdminTransferred(address indexed from, address indexed to);
    event Bound(address indexed user, bytes32 indexed node);

    error NotAdmin();
    error ZeroAddress();

    modifier onlyAdmin() {
        if (msg.sender != admin) revert NotAdmin();
        _;
    }

    constructor(address _registry) {
        registry = EnsSellerRegistry(_registry);
        admin = msg.sender;
        emit AdminTransferred(address(0), msg.sender);
    }

    function transferAdmin(address to) external onlyAdmin {
        if (to == address(0)) revert ZeroAddress();
        emit AdminTransferred(admin, to);
        admin = to;
    }

    /// @notice Point a participant's address at their ENS node (set at onboarding).
    function bind(address user, bytes32 node) external onlyAdmin {
        nodeOf[user] = node;
        emit Bound(user, node);
    }

    function isEligible(address user) external view returns (bool) {
        bytes32 node = nodeOf[user];
        if (node == bytes32(0)) return false;
        return registry.isEligibleSeller(node);
    }
}
