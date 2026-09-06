// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title CommitmentToken
 * @notice A tokenized, unconsumed cloud spend commitment for a single (provider, expiry) pair.
 *         One deployment = one maturity (SPEC §5.1 — deliberately not ERC-1155 multi-maturity).
 *
 *         The whole face value is minted once, at deployment, to the seller. The token trades against
 *         test USDC in a Uniswap v4 pool whose hook (TimeDecayHook) prices in the time left before
 *         `expiry`: the closer to expiry, the less time a buyer has to consume the credit, so the
 *         market value decays toward zero. The token itself carries no price logic — only the facts
 *         the hook needs (`provider`, `faceValue`, `expiry`), all immutable.
 */
contract CommitmentToken is ERC20 {
    enum Provider {
        AWS,
        GCP,
        AZURE
    }

    /// @notice Cloud provider of the underlying commitment.
    Provider public immutable provider;
    /// @notice Face value in whole USD (e.g. 100_000 for a $100k commitment).
    uint256 public immutable faceValue;
    /// @notice Unix timestamp at which the unconsumed commitment is lost.
    uint64 public immutable expiry;

    /// @dev 6 decimals so one whole token unit ≈ $1 of face value, aligning with test USDC (6 dp).
    uint8 private constant DECIMALS = 6;

    error ExpiryInPast();

    /**
     * @param _provider  cloud provider
     * @param _faceValue face value in whole USD
     * @param _expiry    expiry timestamp (must be in the future)
     * @param seller     receives the full minted supply (faceValue scaled to token decimals)
     */
    constructor(Provider _provider, uint256 _faceValue, uint64 _expiry, address seller)
        ERC20(_name(_provider, _expiry), _symbol(_provider))
    {
        if (_expiry <= block.timestamp) revert ExpiryInPast();
        provider = _provider;
        faceValue = _faceValue;
        expiry = _expiry;
        _mint(seller, _faceValue * (10 ** DECIMALS));
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    /// @notice Seconds remaining before expiry; 0 once expired.
    function timeToExpiry() external view returns (uint256) {
        return block.timestamp >= expiry ? 0 : expiry - block.timestamp;
    }

    function _name(Provider p, uint64 e) private pure returns (string memory) {
        return string.concat("Cloud Commitment ", _providerName(p), " @", _u(e));
    }

    function _symbol(Provider p) private pure returns (string memory) {
        return string.concat("cc", _providerName(p));
    }

    function _providerName(Provider p) private pure returns (string memory) {
        if (p == Provider.AWS) return "AWS";
        if (p == Provider.GCP) return "GCP";
        return "AZURE";
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
