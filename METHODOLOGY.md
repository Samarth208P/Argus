# Argus Consensus & Rating Methodology

This document outlines the exact rules, equations, and configurations used by the **Argus** server-side engine to cross-examine Ethereum RPC providers, reach canonical consensus, and rate provider integrity.

---

## 1. Pinned Consensus Checks
To make "lying" objectively definable and eliminate false positives from block propagation delays, all check queries are pinned to a specific block hex.

$$\text{Target Pinned Block} = \text{max}(\text{provider block numbers}) - 10$$

Argus runs three checks on every poll cycle:
1.  **State Honesty (C1):** Query `eth_getBalance(0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045, TargetPinnedBlock)`.
2.  **Block Honesty (C2):** Query `eth_getBlockByNumber(TargetPinnedBlock, false)` and extract the tuple `(hash, parentHash, stateRoot, transactionsRoot)`.
3.  **Continuity (C3):** Check that the current block's `parentHash` equals the `hash` of the previous block fetched from that provider.

---

## 2. Weighted Voting Consensus
Once data is collected, JSON payloads are canonicalized (keys sorted, whitespace stripped) and hashed via SHA-256. Identical response hashes are grouped.

Each provider is assigned an **Independence Share** ($S_i$) based on their operator group to prevent sybil/collusion voting:

$$S_i = \frac{1}{\text{Count of active providers from the same operator group}}$$

For example, if Flashbots and MEV Blocker share the same operator, they each get a vote weight of $0.5$. Distinct nodes (e.g. Cloudflare, Blast, Llama) get a vote weight of $1.0$.

The winning canonical group must command a strict majority of total active weight:

$$\text{Group Weight Tally} = \sum_{p \in \text{Group}} S_p$$

$$\text{Consensus Condition} = \frac{\text{Winning Group Weight}}{\text{Total Polled Weight}} > 50\%$$

If no single group exceeds $50\%$, the poll status is marked as `INCONCLUSIVE`. No accusations are published.

---

## 3. Provider Integrity Scoring
A provider's integrity score is calculated over a rolling window of $W = 50$ polls.

$$\text{Score} = \text{round}\left(100 \times \left(0.5 \cdot \text{Accuracy} + 0.2 \cdot \text{Uptime} + 0.15 \cdot \text{LatencyScore} + 0.15 \cdot \text{FreshnessScore}\right)\right)$$

### Metrics Definitions
*   **Accuracy:** The fraction of online polls where the provider's response matched the consensus group hash.
*   **Uptime:** The fraction of polls where the provider responded in $< 3.0$ seconds without network/CORS errors.
*   **LatencyScore:** Saturated latency rating. Latency below $200\text{ms}$ scores $1.0$, latency above $1500\text{ms}$ scores $0.0$, and intermediate latencies are mapped linearly.
*   **FreshnessScore:** $1.0$ if the block number is within $2$ blocks of the max pool block; otherwise $0.0$ (marked as `STALE`).

---

## 4. The Cryptographic Data Chain
1.  **Leaf Object:** For poll $j$:
    $$L_j = \text{sha256}(\text{canonicalize}(\{id_j, \text{blockHex}_j, \text{consensusHash}_j, \text{status}_j, \text{battery}_j\}))$$
2.  **Hourly commitment:** Every hour, a binary Merkle tree is built from the sorted list of that hour's leaves.
3.  **On-chain Notarization:** The Merkle root is committed to `ArgusAttest` on Sepolia:
    $$\text{commitMerkleRoot}(RootHash)$$
