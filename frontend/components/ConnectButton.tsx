"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";

export function ConnectButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  if (isConnected && address) {
    return (
      <button className="btn ghost mono" onClick={() => disconnect()}>
        {address.slice(0, 6)}…{address.slice(-4)}
      </button>
    );
  }
  return (
    <button className="btn primary" onClick={() => connect({ connector: connectors[0] })}>
      Connect wallet
    </button>
  );
}
