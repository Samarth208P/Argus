#!/usr/bin/env bash
# Deploy ArgusAttest contract on Sepolia using forge

RPC_URL="https://ethereum-sepolia-rpc.publicnode.com"
PRIVATE_KEY="0x49075c74eea0bcb4362c605fc2eccd2f11eb933c7347b2420893eb15bddfb98a"

echo "Checking deployer balance..."
BALANCE=$(~/.foundry/bin/cast balance --rpc-url "$RPC_URL" 0x6c75DE0D36B824B84db4BF2A44B4f8B357a03f5F)
echo "Deployer balance: $BALANCE wei"

if [ "$BALANCE" -eq 0 ]; then
  echo "ERROR: Deployer wallet has 0 balance. Please fund it first!"
  exit 1
fi

echo "Deploying contract..."
~/.foundry/bin/forge create contracts/ArgusAttest.sol:ArgusAttest \
  --rpc-url "$RPC_URL" \
  --private-key "$PRIVATE_KEY" \
  --broadcast
