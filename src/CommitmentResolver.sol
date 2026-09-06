// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/**
 * @title CommitmentResolver
 * @notice An ENSIP-standard text resolver we control, carrying the `commitment.*` records for a
 *         seller's name. We use our own resolver because the ENSv2 Sepolia *beta* shared resolver
 *         rejects `setText` for freshly registered names (its authorization traversal reverts with no
 *         data — a known beta gap; verified on-chain 2026-09-06). Names still resolve to THIS contract
 *         via the real ENS registry (`setResolver`), so resolution stays ENS-native.
 *
 *         It also encodes the SPEC §5.2 role split (the point that makes ENS a design choice, not
 *         decoration): an `issuer` onboards a seller (writes provider/verified/expires + sets status
 *         active), while a delegated `verifier` role may only flip `commitment.status`
 *         (active | suspended | revoked) — it can neither move nor delete the name, nor touch the
 *         other records. Revoking is a single status write; the name is never transferred.
 */
contract CommitmentResolver {
    /// @dev ENSIP text-resolver interface id (`text(bytes32,string)`), plus ERC-165.
    bytes4 private constant INTERFACE_TEXT = 0x59d1d43c;
    bytes4 private constant INTERFACE_ERC165 = 0x01ffc9a7;

    address public issuer;
    mapping(address => bool) public isVerifier;

    // node => keccak256(key) => value
    mapping(bytes32 => mapping(bytes32 => string)) private _texts;

    event IssuerTransferred(address indexed from, address indexed to);
    event VerifierSet(address indexed verifier, bool allowed);
    event Onboarded(bytes32 indexed node, string provider, string verified, uint64 expires);
    event StatusSet(bytes32 indexed node, string status);
    event TextChanged(bytes32 indexed node, string indexed indexedKey, string key, string value);

    error NotIssuer();
    error NotVerifier();
    error ZeroAddress();

    modifier onlyIssuer() {
        if (msg.sender != issuer) revert NotIssuer();
        _;
    }

    /// @dev issuer counts as a verifier too (it can do everything a verifier can).
    modifier onlyVerifier() {
        if (msg.sender != issuer && !isVerifier[msg.sender]) revert NotVerifier();
        _;
    }

    constructor() {
        issuer = msg.sender;
        emit IssuerTransferred(address(0), msg.sender);
    }

    function transferIssuer(address to) external onlyIssuer {
        if (to == address(0)) revert ZeroAddress();
        emit IssuerTransferred(issuer, to);
        issuer = to;
    }

    /// @notice Grant/revoke the delegated verification role (EAC-style delegation).
    function setVerifier(address verifier, bool allowed) external onlyIssuer {
        if (verifier == address(0)) revert ZeroAddress();
        isVerifier[verifier] = allowed;
        emit VerifierSet(verifier, allowed);
    }

    /// @notice Onboard a seller name: write the commitment facts and set status active.
    function onboard(bytes32 node, string calldata provider, string calldata verified, uint64 expires)
        external
        onlyIssuer
    {
        _set(node, "commitment.provider", provider);
        _set(node, "commitment.verified", verified);
        _set(node, "commitment.expires", _u(expires));
        _set(node, "commitment.status", "active");
        emit Onboarded(node, provider, verified, expires);
    }

    /// @notice Delegated verifier flips status only (active | suspended | revoked). Name untouched.
    function setStatus(bytes32 node, string calldata status) external onlyVerifier {
        _set(node, "commitment.status", status);
        emit StatusSet(node, status);
    }

    /// @notice ENSIP text record read.
    function text(bytes32 node, string calldata key) external view returns (string memory) {
        return _texts[node][keccak256(bytes(key))];
    }

    function supportsInterface(bytes4 id) external pure returns (bool) {
        return id == INTERFACE_TEXT || id == INTERFACE_ERC165;
    }

    function _set(bytes32 node, string memory key, string memory value) private {
        _texts[node][keccak256(bytes(key))] = value;
        emit TextChanged(node, key, key, value);
    }

    function _u(uint64 v) private pure returns (string memory) {
        if (v == 0) return "0";
        uint64 t = v;
        uint256 n;
        while (t != 0) {
            n++;
            t /= 10;
        }
        bytes memory b = new bytes(n);
        while (v != 0) {
            b[--n] = bytes1(uint8(48 + (v % 10)));
            v /= 10;
        }
        return string(b);
    }
}
