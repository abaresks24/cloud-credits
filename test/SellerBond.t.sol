// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {SellerBond} from "../src/SellerBond.sol";

contract Tok is ERC20 {
    constructor() ERC20("USDC", "USDC") {}
    function decimals() public pure override returns (uint8) { return 6; }
    function mint(address to, uint256 a) external { _mint(to, a); }
}

contract SellerBondTest is Test {
    Tok usdc;
    SellerBond bond;
    address officer = makeAddr("officer");
    address pool = makeAddr("pool");
    address seller = makeAddr("seller");
    uint256 constant MIN = 50_000e6;
    uint256 constant COOLDOWN = 1 days;

    function setUp() public {
        usdc = new Tok();
        bond = new SellerBond(address(usdc), MIN, COOLDOWN, officer, pool);
        usdc.mint(seller, 1_000_000e6);
        vm.prank(seller);
        usdc.approve(address(bond), type(uint256).max);
    }

    function test_deposit_meetsMinimum() public {
        vm.prank(seller);
        bond.deposit(MIN);
        assertTrue(bond.hasBond(seller));
        assertEq(bond.bondOf(seller), MIN);
    }

    function test_belowMinimum_isNotBonded() public {
        vm.prank(seller);
        bond.deposit(MIN - 1);
        assertFalse(bond.hasBond(seller));
    }

    function test_withdraw_needsRequestThenCooldown() public {
        vm.startPrank(seller);
        bond.deposit(MIN);

        vm.expectRevert(SellerBond.StillLocked.selector); // no unbond requested
        bond.withdraw();

        bond.requestUnbond();
        vm.expectRevert(SellerBond.StillLocked.selector); // cooldown not elapsed
        bond.withdraw();

        vm.warp(block.timestamp + COOLDOWN);
        uint256 before = usdc.balanceOf(seller);
        bond.withdraw();
        vm.stopPrank();
        assertEq(usdc.balanceOf(seller), before + MIN);
        assertFalse(bond.hasBond(seller));
    }

    function test_deposit_cancelsPendingUnbond() public {
        vm.startPrank(seller);
        bond.deposit(MIN);
        bond.requestUnbond();
        bond.deposit(1); // cancels the pending unbond
        vm.warp(block.timestamp + COOLDOWN + 1);
        vm.expectRevert(SellerBond.StillLocked.selector);
        bond.withdraw();
        vm.stopPrank();
    }

    function test_slash_onlyArbiter_fundsPool() public {
        vm.prank(seller);
        bond.deposit(MIN);

        vm.prank(seller);
        vm.expectRevert(SellerBond.NotArbiter.selector);
        bond.slash(seller);

        uint256 before = usdc.balanceOf(pool);
        vm.prank(officer);
        bond.slash(seller);
        assertEq(usdc.balanceOf(pool), before + MIN);
        assertFalse(bond.hasBond(seller));
    }

    function test_slash_evenDuringCooldown() public {
        vm.startPrank(seller);
        bond.deposit(MIN);
        bond.requestUnbond();
        vm.stopPrank();
        // a fraudster cannot escape by requesting an unbond: the arbiter can still slash
        vm.prank(officer);
        bond.slash(seller);
        assertEq(bond.bondOf(seller), 0);
    }
}
