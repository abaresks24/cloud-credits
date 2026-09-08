// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title SellerBond
 * @notice Economic skin-in-the-game for sellers (the trust-minimization layer, "Niveau 1"). A seller
 *         must post a bond to list a commitment; if the commitment turns out fraudulent, the
 *         compliance officer (arbiter) slashes the bond to a compensation pool — so a buyer is made
 *         whole on-chain even when the real-world credit fails. Honest boundary: the bond does not
 *         remove the need for a *trigger* (who declares fraud) — it replaces reputational trust with
 *         an economic guarantee and an automatic remedy. A clean exit requires requesting an unbond
 *         and waiting out a cooldown, so a fraudster cannot withdraw before being caught.
 */
contract SellerBond {
    using SafeERC20 for IERC20;

    IERC20 public immutable bondToken;
    uint256 public immutable minBond;
    uint256 public immutable cooldown;

    address public arbiter; // compliance officer — may slash
    address public beneficiary; // compensation pool — receives slashed funds

    mapping(address => uint256) public bondOf;
    mapping(address => uint256) public unlockAt; // 0 = locked (no pending unbond)

    event Deposited(address indexed seller, uint256 amount, uint256 total);
    event UnbondRequested(address indexed seller, uint256 unlockAt);
    event Withdrawn(address indexed seller, uint256 amount);
    event Slashed(address indexed seller, uint256 amount, address indexed beneficiary);
    event ArbiterTransferred(address indexed from, address indexed to);
    event BeneficiarySet(address indexed beneficiary);

    error NotArbiter();
    error NoBond();
    error StillLocked();
    error ZeroAddress();

    modifier onlyArbiter() {
        if (msg.sender != arbiter) revert NotArbiter();
        _;
    }

    constructor(address _token, uint256 _minBond, uint256 _cooldown, address _arbiter, address _beneficiary) {
        if (_arbiter == address(0) || _beneficiary == address(0)) revert ZeroAddress();
        bondToken = IERC20(_token);
        minBond = _minBond;
        cooldown = _cooldown;
        arbiter = _arbiter;
        beneficiary = _beneficiary;
    }

    /// @notice Post (or top up) a bond. Depositing cancels any pending unbond.
    function deposit(uint256 amount) external {
        bondToken.safeTransferFrom(msg.sender, address(this), amount);
        bondOf[msg.sender] += amount;
        unlockAt[msg.sender] = 0;
        emit Deposited(msg.sender, amount, bondOf[msg.sender]);
    }

    /// @notice Whether `seller` currently satisfies the minimum bond.
    function hasBond(address seller) external view returns (bool) {
        return bondOf[seller] >= minBond;
    }

    /// @notice Start the exit cooldown. The arbiter can still slash during it.
    function requestUnbond() external {
        if (bondOf[msg.sender] == 0) revert NoBond();
        unlockAt[msg.sender] = block.timestamp + cooldown;
        emit UnbondRequested(msg.sender, unlockAt[msg.sender]);
    }

    /// @notice Withdraw the full bond after requesting and waiting out the cooldown.
    function withdraw() external {
        uint256 amt = bondOf[msg.sender];
        if (amt == 0) revert NoBond();
        uint256 u = unlockAt[msg.sender];
        if (u == 0 || block.timestamp < u) revert StillLocked();
        bondOf[msg.sender] = 0;
        unlockAt[msg.sender] = 0;
        bondToken.safeTransfer(msg.sender, amt);
        emit Withdrawn(msg.sender, amt);
    }

    /// @notice Slash a seller's bond to the compensation pool (fraud declared by the officer).
    function slash(address seller) external onlyArbiter {
        uint256 amt = bondOf[seller];
        if (amt == 0) revert NoBond();
        bondOf[seller] = 0;
        unlockAt[seller] = 0;
        bondToken.safeTransfer(beneficiary, amt);
        emit Slashed(seller, amt, beneficiary);
    }

    function transferArbiter(address to) external onlyArbiter {
        if (to == address(0)) revert ZeroAddress();
        emit ArbiterTransferred(arbiter, to);
        arbiter = to;
    }

    function setBeneficiary(address to) external onlyArbiter {
        if (to == address(0)) revert ZeroAddress();
        beneficiary = to;
        emit BeneficiarySet(to);
    }
}
