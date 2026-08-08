// ============================================================
// Censorship Probe Module — C5 check
// Sends 0-value self-transfer transaction probes to detect if
// any RPC providers censor transactions relative to the quorum.
// ============================================================

import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { sepolia } from "viem/chains";

export interface ProbeResult {
  providerId: string;
  txHash: string | null;
  accepted: boolean;
  error?: string;
}

export async function sendCensorshipProbe(
  providerId: string,
  providerUrl: string,
  privateKey: `0x${string}`
): Promise<ProbeResult> {
  if (!privateKey) {
    return { providerId, txHash: null, accepted: false, error: "Private key not configured" };
  }

  try {
    const account = privateKeyToAccount(privateKey);
    const client = createWalletClient({
      account,
      chain: sepolia,
      transport: http(providerUrl),
    });

    // Send 0 ETH transfer to self
    const txHash = await client.sendTransaction({
      to: account.address,
      value: 0n,
    });

    return {
      providerId,
      txHash,
      accepted: true,
    };
  } catch (err) {
    return {
      providerId,
      txHash: null,
      accepted: false,
      error: String(err),
    };
  }
}
