// ============================================================
// Provider Registry — PRD Appendix B
// Static list of built-in providers + operator map for
// independence-weighted consensus voting.
// ============================================================

export type ProviderType = "node" | "aggregator" | "relay" | "send";

export interface Provider {
  id: string;
  url: string;
  label: string;
  operator: string;
  type: ProviderType;
  isSim?: boolean;
  network: "mainnet" | "sepolia";
}

// ── Mainnet defaults ──────────────────────────────────────
export const MAINNET_PROVIDERS: Provider[] = [
  { id: "cloudflare", url: "https://cloudflare-eth.com", label: "Cloudflare", operator: "cloudflare", type: "node", network: "mainnet" },
  { id: "llama", url: "https://eth.llamarpc.com", label: "LlamaNodes", operator: "llamanodes", type: "node", network: "mainnet" },
  { id: "publicnode", url: "https://ethereum.publicnode.com", label: "PublicNode", operator: "grove", type: "node", network: "mainnet" },
  { id: "drpc", url: "https://eth.drpc.org", label: "dRPC", operator: "drpc", type: "aggregator", network: "mainnet" },
  { id: "1rpc", url: "https://1rpc.io/eth", label: "1RPC", operator: "automata", type: "relay", network: "mainnet" },
  { id: "blast", url: "https://eth-mainnet.public.blastapi.io", label: "BlastAPI", operator: "blast", type: "node", network: "mainnet" },
  { id: "tenderly", url: "https://mainnet.gateway.tenderly.co", label: "Tenderly", operator: "tenderly", type: "node", network: "mainnet" },
  { id: "onfinality", url: "https://eth.api.onfinality.io/public", label: "OnFinality", operator: "onfinality", type: "node", network: "mainnet" },
  { id: "flashbots", url: "https://rpc.flashbots.net", label: "Flashbots Protect", operator: "flashbots", type: "send", network: "mainnet" },
  { id: "mevblocker", url: "https://rpc.mevblocker.io", label: "MEV Blocker", operator: "flashbots", type: "send", network: "mainnet" },
];

// ── Sepolia defaults ──────────────────────────────────────
export const SEPOLIA_PROVIDERS: Provider[] = [
  { id: "sepolia-core", url: "https://rpc.sepolia.org", label: "Sepolia Core", operator: "sepolia-core", type: "node", network: "sepolia" },
  { id: "tenderly-sep", url: "https://sepolia.gateway.tenderly.co", label: "Tenderly Sepolia", operator: "tenderly", type: "node", network: "sepolia" },
  { id: "publicnode-sep", url: "https://ethereum-sepolia-rpc.publicnode.com", label: "PublicNode Sepolia", operator: "grove", type: "node", network: "sepolia" },
  { id: "drpc-sep", url: "https://sepolia.drpc.org", label: "dRPC Sepolia", operator: "drpc", type: "aggregator", network: "sepolia" },
  { id: "blast-sep", url: "https://eth-sepolia.public.blastapi.io", label: "BlastAPI Sepolia", operator: "blast", type: "node", network: "sepolia" },
  { id: "1rpc-sep", url: "https://1rpc.io/sepolia", label: "1RPC Sepolia", operator: "automata", type: "relay", network: "sepolia" },
];

// ── All built-in providers ────────────────────────────────
export const ALL_PROVIDERS: Provider[] = [
  ...MAINNET_PROVIDERS,
  ...SEPOLIA_PROVIDERS,
];

// ── Independence share calculator ────────────────────────
// Prevents one operator running N endpoints from getting N votes.
// Each operator group gets 1 vote split equally among its members.
export function getIndependenceShare(
  providerId: string,
  allProviders: Provider[]
): number {
  const provider = allProviders.find((p) => p.id === providerId);
  if (!provider) return 0;

  const sameOperatorCount = allProviders.filter(
    (p) => p.operator === provider.operator && p.network === provider.network
  ).length;

  return 1 / sameOperatorCount;
}
