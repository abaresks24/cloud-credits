// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {CommitmentResolver} from "../src/CommitmentResolver.sol";
import {EnsSellerRegistry} from "../src/EnsSellerRegistry.sol";
import {EnsEligibilityAdapter} from "../src/EnsEligibilityAdapter.sol";

/// Wires the ENS-node registry to the hook's address-based eligibility gate.
contract EnsEligibilityAdapterTest is Test {
    CommitmentResolver resolver;
    EnsSellerRegistry registry;
    EnsEligibilityAdapter adapter;

    address user = makeAddr("user");
    address stranger = makeAddr("stranger");
    bytes32 constant NODE = keccak256("acme.cloudcredits.eth");

    function setUp() public {
        resolver = new CommitmentResolver();
        registry = new EnsSellerRegistry(address(resolver));
        adapter = new EnsEligibilityAdapter(address(registry));
    }

    function test_boundActiveUser_isEligible() public {
        resolver.onboard(NODE, "aws", "attested", 1_800_000_000);
        adapter.bind(user, NODE);
        assertTrue(adapter.isEligible(user));
    }

    function test_unbound_isNotEligible() public view {
        assertFalse(adapter.isEligible(user));
    }

    function test_boundButRevoked_isNotEligible() public {
        resolver.onboard(NODE, "aws", "attested", 1_800_000_000);
        adapter.bind(user, NODE);
        resolver.setStatus(NODE, "revoked");
        assertFalse(adapter.isEligible(user));
    }

    function test_onlyAdmin_canBind() public {
        vm.prank(stranger);
        vm.expectRevert(EnsEligibilityAdapter.NotAdmin.selector);
        adapter.bind(user, NODE);
    }
}
