// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

/// @notice Eligibility oracle for the venue. Decouples the hook (RISK #1 / routing) from *how*
///         eligibility is decided (an ENS-backed adapter, a mock in tests, etc.).
interface IEligibility {
    function isEligible(address user) external view returns (bool);
}
