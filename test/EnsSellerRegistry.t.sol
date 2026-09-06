// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {CommitmentResolver} from "../src/CommitmentResolver.sol";
import {EnsSellerRegistry} from "../src/EnsSellerRegistry.sol";

/// J2 — the registry reads `commitment.status` from a resolver and gates seller eligibility on it.
contract EnsSellerRegistryTest is Test {
    CommitmentResolver resolver;
    EnsSellerRegistry registry;

    address issuer = address(this);
    address verifier = makeAddr("verifier");
    address stranger = makeAddr("stranger");

    // a seller's ENS node (e.g. namehash of acme.cloudcredits.eth)
    bytes32 constant NODE = keccak256("acme.cloudcredits.eth");
    uint64 constant EXPIRES = 1_800_000_000; // some future business expiry of the commitment

    function setUp() public {
        resolver = new CommitmentResolver(); // issuer = this
        registry = new EnsSellerRegistry(address(resolver));
        resolver.setVerifier(verifier, true);
    }

    /// Checkpoint: a test reads commitment.status on-chain and the registry gates on it.
    function test_onboardedSeller_isEligible_andRecordsRead() public {
        resolver.onboard(NODE, "aws", "attested", EXPIRES);

        assertTrue(registry.isEligibleSeller(NODE), "active seller should be eligible");

        (string memory status, string memory provider, string memory verified, string memory expires) =
            registry.commitmentOf(NODE);
        assertEq(status, "active");
        assertEq(provider, "aws");
        assertEq(verified, "attested");
        assertEq(expires, "1800000000");
    }

    /// SPEC §6 step 8: a delegated verifier flips status to revoked → eligibility drops live,
    /// and the ENS name is never moved or deleted (the verifier can't — it only writes status).
    function test_verifierRevokes_dropsEligibility() public {
        resolver.onboard(NODE, "gcp", "attested", EXPIRES);
        assertTrue(registry.isEligibleSeller(NODE));

        vm.prank(verifier);
        resolver.setStatus(NODE, "revoked");

        assertFalse(registry.isEligibleSeller(NODE), "revoked seller must be ineligible");
        assertEq(registry.status(NODE), "revoked");
    }

    /// A "suspended" status is not "active" → ineligible (only exact "active" passes).
    function test_suspended_isNotEligible() public {
        resolver.onboard(NODE, "azure", "attested", EXPIRES);
        vm.prank(verifier);
        resolver.setStatus(NODE, "suspended");
        assertFalse(registry.isEligibleSeller(NODE));
    }

    /// A non-verifier cannot change status (EAC role separation).
    function test_stranger_cannotSetStatus() public {
        resolver.onboard(NODE, "aws", "attested", EXPIRES);
        vm.prank(stranger);
        vm.expectRevert(CommitmentResolver.NotVerifier.selector);
        resolver.setStatus(NODE, "revoked");
    }

    /// Only the issuer can onboard (write the facts).
    function test_stranger_cannotOnboard() public {
        vm.prank(stranger);
        vm.expectRevert(CommitmentResolver.NotIssuer.selector);
        resolver.onboard(NODE, "aws", "attested", EXPIRES);
    }

    /// Fail-closed: an unknown node (no records) is not eligible.
    function test_unknownNode_isNotEligible() public view {
        assertFalse(registry.isEligibleSeller(keccak256("nobody.cloudcredits.eth")));
    }
}
