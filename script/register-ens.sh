#!/usr/bin/env bash
# J1 — register a 2LD on ENSv2 Sepolia beta (commit-reveal, paid in MockUSDC).
# Interface confirmed from ensdomains/namechain: contracts/src/registrar/interfaces/IETHRegistrar.sol
#   makeCommitment(label, owner, secret, subregistry, resolver, duration, referrer)
#   register(label, owner, secret, subregistry, resolver, duration, paymentToken, referrer)
set -u
cd /Users/arthur/hackathons/cloud-credits
set -a; source .env; set +a

RPC="$SEPOLIA_RPC_URL"
REG="0xa88553f454b77203b0d036a05c894d555eaaa2cc"        # ETHRegistrar (beta)
MUSDC="0x768f42455a2d082e23ceef7d51e5787c82d67a39"      # MockUSDC (freely mintable, accepted payment token)
RESOLVER="0xe7b9a25607e02da8145e4eb1836ca539e53f11f7"   # PublicResolverV2
LABEL="cloudcredits"
OWNER="$WALLET_ADDRESS"
SUBREG="0x0000000000000000000000000000000000000000"
DUR=31536000
REF="0x0000000000000000000000000000000000000000000000000000000000000000"
SECRET="0x$(openssl rand -hex 32)"

echo "label=$LABEL owner=$OWNER secret=$SECRET"
echo "available: $(cast call $REG 'isAvailable(string)(bool)' "$LABEL" --rpc-url $RPC)"
echo "price(USDC): $(cast call $REG 'getRegisterPrice(string,uint64,address)(uint256)' "$LABEL" $DUR $MUSDC --rpc-url $RPC)"

COMMIT=$(cast call $REG "makeCommitment(string,address,bytes32,address,address,uint64,bytes32)(bytes32)" \
  "$LABEL" "$OWNER" "$SECRET" "$SUBREG" "$RESOLVER" "$DUR" "$REF" --rpc-url $RPC)
echo "commitment=$COMMIT"

echo "--- commit() ---"
cast send $REG "commit(bytes32)" "$COMMIT" --private-key "$PRIVATE_KEY" --rpc-url $RPC 2>&1 | grep -E "status|transactionHash|error|revert" | head -4

echo "--- waiting 70s (MIN_COMMITMENT_AGE=60) ---"
sleep 70

echo "--- approve MockUSDC to registrar ---"
cast send $MUSDC "approve(address,uint256)" $REG 100000000 --private-key "$PRIVATE_KEY" --rpc-url $RPC 2>&1 | grep -E "status|transactionHash|error" | head -3

echo "--- register() ---"
cast send $REG "register(string,address,bytes32,address,address,uint64,address,bytes32)" \
  "$LABEL" "$OWNER" "$SECRET" "$SUBREG" "$RESOLVER" "$DUR" "$MUSDC" "$REF" \
  --private-key "$PRIVATE_KEY" --rpc-url $RPC 2>&1 | grep -E "status|transactionHash|error|revert" | head -6

echo "DONE"
