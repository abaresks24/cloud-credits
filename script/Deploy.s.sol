// SPDX-License-Identifier: MIT
pragma solidity 0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {IPoolManager} from "v4-core/src/interfaces/IPoolManager.sol";
import {IHooks} from "v4-core/src/interfaces/IHooks.sol";
import {Hooks} from "v4-core/src/libraries/Hooks.sol";
import {PoolKey} from "v4-core/src/types/PoolKey.sol";
import {Currency} from "v4-core/src/types/Currency.sol";
import {TickMath} from "v4-core/src/libraries/TickMath.sol";
import {HookMiner} from "v4-periphery/test/shared/HookMiner.sol";

import {CommitmentToken} from "../src/CommitmentToken.sol";
import {CommitmentResolver} from "../src/CommitmentResolver.sol";
import {EnsSellerRegistry} from "../src/EnsSellerRegistry.sol";
import {EnsEligibilityAdapter} from "../src/EnsEligibilityAdapter.sol";
import {TimeDecayHook} from "../src/TimeDecayHook.sol";
import {CommitmentRouter} from "../src/CommitmentRouter.sol";
import {SellerBond} from "../src/SellerBond.sol";

interface IMintableUSDC {
    function mint(address to, uint256 amount) external;
    function approve(address spender, uint256 amount) external returns (bool);
    function balanceOf(address) external view returns (uint256);
}

/**
 * @notice J4 — deploy the whole venue on Sepolia and prove a conformant purchase end-to-end:
 *         CommitmentToken + ENS-backed eligibility + TimeDecayHook (mined address) + pool + seeded
 *         reserves + one live buy that reflects the time decay.
 *
 * Run: forge script script/Deploy.s.sol --rpc-url $SEPOLIA_RPC_URL --broadcast --private-key $PRIVATE_KEY
 */
contract Deploy is Script {
    // Sepolia (pinned + verified — see addresses.ts)
    IPoolManager constant MANAGER = IPoolManager(0xE03A1074c86CFeDd5C142C4F04F1a1536e203543);
    address constant MOCK_USDC = 0x768F42455A2D082E23ceeF7d51e5787C82d67a39; // freely mintable, 6dp
    address constant CREATE2_DEPLOYER = 0x4e59b44847b379578588920cA78FbF26c0B4956C;
    // cloudcredits.eth (registered J1)
    bytes32 constant NODE = 0xfc47d1666a0b864f859c0b1b22510ec26cd8f97786426433b8031f31ef03c78b;

    uint160 constant SQRT_PRICE_1_1 = 79228162514264337593543950336;
    uint256 constant HORIZON = 730 days;

    function run() external {
        uint256 pk = vm.envUint("PRIVATE_KEY");
        address me = vm.addr(pk);
        vm.startBroadcast(pk);

        // 1) the tokenized commitment: $100k AWS, expiring in 24 months, minted to the deployer
        uint64 expiry = uint64(block.timestamp + 730 days);
        CommitmentToken token = new CommitmentToken(CommitmentToken.Provider.AWS, 100_000, expiry, me);

        // 2) ENS-backed eligibility (our resolver carries commitment.* records + EAC roles)
        CommitmentResolver resolver = new CommitmentResolver();
        EnsSellerRegistry registry = new EnsSellerRegistry(address(resolver));
        EnsEligibilityAdapter adapter = new EnsEligibilityAdapter(address(registry));
        resolver.onboard(NODE, "aws", "attested", expiry); // cloudcredits.eth -> active
        adapter.bind(me, NODE); // the deployer trades as cloudcredits.eth

        // 3) seller bond (trust-minimization): officer = deployer, compensation pool = deployer
        SellerBond bond = new SellerBond(MOCK_USDC, 50_000e6, 1 days, me, me);

        // 4) mine + deploy the hook at an address carrying its permission flags
        uint160 flags =
            uint160(Hooks.BEFORE_SWAP_FLAG | Hooks.BEFORE_SWAP_RETURNS_DELTA_FLAG | Hooks.BEFORE_ADD_LIQUIDITY_FLAG);
        Currency usdcCurrency = Currency.wrap(MOCK_USDC);
        bytes memory args = abi.encode(MANAGER, adapter, token, usdcCurrency, HORIZON, me, address(bond));
        (address hookAddr, bytes32 salt) =
            HookMiner.find(CREATE2_DEPLOYER, flags, type(TimeDecayHook).creationCode, args);
        TimeDecayHook hook = new TimeDecayHook{salt: salt}(MANAGER, adapter, token, usdcCurrency, HORIZON, me, address(bond));
        require(address(hook) == hookAddr, "hook address mismatch");

        // 4) the venue router (forwards the real user; RISK #1)
        CommitmentRouter router = new CommitmentRouter(MANAGER);
        hook.setRouter(address(router), true);

        // 5) create the pool
        (Currency c0, Currency c1) = address(token) < MOCK_USDC
            ? (Currency.wrap(address(token)), usdcCurrency)
            : (usdcCurrency, Currency.wrap(address(token)));
        PoolKey memory key =
            PoolKey({currency0: c0, currency1: c1, fee: 3000, tickSpacing: 60, hooks: IHooks(hookAddr)});
        MANAGER.initialize(key, SQRT_PRICE_1_1);

        // 6) post the seller bond, then seed the hook's reserves (eligible + bonded LP = deployer)
        IMintableUSDC(MOCK_USDC).mint(me, 300_000e6);
        IMintableUSDC(MOCK_USDC).approve(address(bond), type(uint256).max);
        bond.deposit(50_000e6); // skin in the game before listing
        token.approve(address(hook), type(uint256).max);
        IMintableUSDC(MOCK_USDC).approve(address(hook), type(uint256).max);
        hook.seedLiquidity(50_000e6, 200_000e6);

        // 7) conformant buy e2e: spend 1_000 USDC for ACME through the venue router
        uint256 tokBefore = token.balanceOf(me);
        IMintableUSDC(MOCK_USDC).approve(address(router), type(uint256).max);
        bool zeroForOne = Currency.unwrap(c0) == MOCK_USDC;
        router.swap(
            key,
            IPoolManager.SwapParams({
                zeroForOne: zeroForOne,
                amountSpecified: -int256(1_000e6),
                sqrtPriceLimitX96: zeroForOne ? TickMath.MIN_SQRT_PRICE + 1 : TickMath.MAX_SQRT_PRICE - 1
            })
        );
        uint256 gained = token.balanceOf(me) - tokBefore;
        require(gained > 0, "buy did not deliver ACME");

        vm.stopBroadcast();

        console2.log("CommitmentToken  ", address(token));
        console2.log("CommitmentResolver", address(resolver));
        console2.log("EnsSellerRegistry ", address(registry));
        console2.log("EnsEligibilityAdapter", address(adapter));
        console2.log("SellerBond       ", address(bond));
        console2.log("TimeDecayHook    ", address(hook));
        console2.log("CommitmentRouter ", address(router));
        console2.log("factor bips now  ", hook.currentFactorBips());
        console2.log("ACME gained (6dp)", gained);
    }
}
