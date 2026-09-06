// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @dev Minimal ENSIP text-resolver read interface.
interface ITextResolver {
    function text(bytes32 node, string calldata key) external view returns (string memory);
}

/**
 * @title EnsSellerRegistry
 * @notice Read-only adapter over ENS (SPEC §5.2). Given a seller's ENS `node`, it reads the
 *         `commitment.*` records from the resolver that name points to and decides seller eligibility.
 *
 *         Eligibility depends on `commitment.status == "active"`, NEVER on the ENS name's own
 *         expiration (the beta grace period is 28 days and an expired name can be renewed by anyone,
 *         so name expiry cannot be a revocation mechanism — SPEC §5.2). `commitment.expires` is a
 *         business attribute (the cloud commitment's own expiry) consumed by the pricing hook, not a
 *         gate here.
 *
 *         Fail-closed: any revert or empty status reads as not-eligible.
 */
contract EnsSellerRegistry {
    ITextResolver public immutable resolver;

    string private constant K_STATUS = "commitment.status";
    string private constant K_PROVIDER = "commitment.provider";
    string private constant K_VERIFIED = "commitment.verified";
    string private constant K_EXPIRES = "commitment.expires";

    bytes32 private constant STATUS_ACTIVE = keccak256(bytes("active"));

    /**
     * @param _resolver the resolver our seller names point to (our CommitmentResolver on the beta;
     *        in production, the ENSv2 Permissioned Resolver once its write path is stable).
     */
    constructor(address _resolver) {
        resolver = ITextResolver(_resolver);
    }

    /// @notice True iff the seller's commitment status is exactly "active".
    function isEligibleSeller(bytes32 node) external view returns (bool) {
        return keccak256(bytes(_read(node, K_STATUS))) == STATUS_ACTIVE;
    }

    /// @notice Full commitment view for UIs / "why refused" screens.
    function commitmentOf(bytes32 node)
        external
        view
        returns (string memory commitmentStatus, string memory provider, string memory verified, string memory expires)
    {
        return (_read(node, K_STATUS), _read(node, K_PROVIDER), _read(node, K_VERIFIED), _read(node, K_EXPIRES));
    }

    function status(bytes32 node) external view returns (string memory) {
        return _read(node, K_STATUS);
    }

    /// @dev fail-closed text read.
    function _read(bytes32 node, string memory key) private view returns (string memory) {
        try resolver.text(node, key) returns (string memory v) {
            return v;
        } catch {
            return "";
        }
    }
}
