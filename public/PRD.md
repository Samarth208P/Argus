# PRODUCT REQUIREMENTS DOCUMENT
**Product:** Argus — Lie Detector for Ethereum RPCs
**Version:** 2.0 (Server-Side + Verifiable Audit) · **Status:** Hackathon Build (12h sprint)
**Event:** Road to Devcon 2026 — IIT Roorkee · **Track:** Censorship Resistance
**Date:** 08 Aug 2026
**Companion docs:** `design.md` (all visual/UI design), `README.md` (run instructions)

> All visual design — layout, color, typography, component styling, motion — is owned by **design.md**. This PRD specifies behavior, data, and functional requirements only.

---

## 1. Problem Statement
Every wallet and dApp silently trusts a single RPC provider. Providers can serve stale data, incorrect state, or censor transactions (≈46% of mainnet blocks have been produced by OFAC-compliant/censoring builders per published research). Existing tools are passive dashboards, heavy full-node monitors, or staked protocols. No tool acts as an independent, always-on monitor that detects lies **per-request with publicly verifiable cryptographic evidence**, proving its own judgments cannot be tampered with.

## 2. Product Summary
Argus is a **server-side** monitor and aggregator that continuously cross-examines multiple RPC providers on a scheduled cadence. It reaches weighted consensus on canonical data, classifies deviations (deviant / stale / censoring / down), scores providers over time, and publishes every accusation with independently verifiable evidence. To eliminate the need to "trust the server," Argus acts as a **Reporter, not a Judge**: it publishes raw evidence, commits hashes to Ethereum, and provides a `/verify` route where anyone can re-run the open-source consensus math in their own browser to prove the server didn't cook the books.

## 3. Goals & Non-Goals
**Goals (G1–G4)**
- G1 Detect provider misbehavior continuously via an always-on server observer.
- G2 Make the server's own accusations cryptographically verifiable by any skeptical third party.
- G3 Build a continuous, public reputation history for RPC providers.
- G4 Ship a complete, demoable, deployed product within 12 hours.

**Non-Goals (NG1–NG4)**
- NG1 No user accounts/authentication (public read-only API and dashboard).
- NG2 No light-client or zk proof verification (documented as upgrade path only).
- NG3 No token/economics/staking.
- NG4 No visual design decisions in this document → `design.md`.

## 4. Glossary
| Term | Meaning |
|---|---|
| Canonical data | Responses that must be identical across honest nodes at a pinned block |
| Node-local data | Legitimately variable responses (gas estimates, mempool) — never judged |
| Pinned query | Query bound to an explicit finalized block number (hex) |
| Independence share | Anti-collusion vote weight per operator group |
| Incident | A confirmed misbehavior event with evidence |
| Merkle Root Commitment | Hourly on-chain hash of all polls, preventing the server from deleting history |

## 5. System Architecture (components)
1. **Registry** — provider list (built-in + custom) with operator metadata.
2. **Polling Engine** — scheduled server-side fan-out triggered via external cron to `/api/poll`.
3. **Consensus Module** — normalization, hashing, weighted voting, inconclusive handling.
4. **Classifier** — retries + deviation typing.
5. **Continuity Watch** — cryptographic block-hash chain validation.
6. **Censorship Probe** — differential write-path testing with a dedicated probe EOA.
7. **Scorer** — rolling-window metrics + composite integrity score + trend.
8. **Evidence Store** — public evidence API backed by Supabase DB.
9. **Attestation Writer** — submits incident digests and hourly Merkle roots to `ArgusAttest` on Sepolia.
10. **Adversary Simulator** — server-side RPC proxy with selectable failure modes for deterministic demos.
11. **Verifiable Audit Engine** — `/verify` page that fetches raw evidence and recomputes consensus math in the user's browser to validate server claims against on-chain hashes.

## 6. Feature Specifications

### F-01 Provider Registry
- Built-in list of 8 free public RPCs (validated for stability).
- Add custom provider via UI: URL + optional label + API key (stored securely in DB).
- Static `OPERATOR_MAP` (provider → operator) used for independence weighting.
- **AC:** added provider appears in leaderboard and receives scores within 2 poll cycles.

### F-02 Polling Engine
- Server-side cron trigger every 20–30s (via GitHub Actions or cron-job.org hitting Netlify `/api/poll`).
- Battery per poll: C1 + C2 + C4; C5 every 10th poll; C3 derived from C2.
- Timeout 3s per provider; poll valid only with ≥5 successful responses.
- **AC:** a provider timing out is recorded as DOWN, excluded from consensus, never classified as liar.

### F-03 Check Battery
- **C1 State honesty:** `eth_getBalance(TARGET, finalized)`; compare raw hex.
- **C2 Block honesty:** `eth_getBlockByNumber(finalized, false)`; compare tuple `(hash, parentHash, stateRoot, transactionsRoot)`.
- **C3 Continuity:** provider's current block `parentHash` must equal its previous poll's `hash`.
- **C4 Freshness:** `eth_blockNumber` lag vs pool max; lag ≥ 2 → STALE.
- **C5 Censorship probe:** 0-value self-transfer from probe EOA; refusal/timeout while quorum accepts → CENSORING.

### F-04 Consensus & Truth
- Canonicalize JSON (sorted keys) → sha256 → group identical responses.
- Vote weight `w = independenceShare × max(0.2, score/100)`.
- Truth = group with >50% total weight; else **INCONCLUSIVE** (no penalties, logged).

### F-05 Classifier
- Outlier re-queried 2× before confirmation.
- Kinds: `DEVIANT`, `STALE`, `CENSORING`, `DOWN`.
- **AC:** transient single-poll mismatch never produces an incident.

### F-06 Integrity Scoring
- Rolling window W=50 polls per provider.
- `score = round(100 × (0.5·accuracy + 0.2·uptime + 0.15·latencyScore + 0.15·freshnessScore))`
- Trend = `IMPROVING` / `DEGRADING` / `STABLE` based on window delta.

### F-07 Leaderboard & F-08 Provider Drawer
- Sortable columns: provider, score, accuracy %, latency, uptime, trend.
- Drawer shows score-over-time series, incident markers, and latency sparklines.

### F-09 Evidence Drawer (Trust Core)
Per incident: timestamp, exact request (**pinned block hex**), consensus vs provider diff.
Receipts provided:
1. On-chain attestation tx link.
2. Pinned block explorer link.
3. Copyable `curl` command reproducing the exact check.
4. **VERIFY Button** → triggers client-side re-computation of the consensus math.

### F-10 Live Event Feed & F-11 Auto Router
- Timestamped stream of polls and incidents.
- Router logic suggests the highest-scoring live provider (displayed in UI as a recommendation engine).
- **Auto Router Safety & Fallback Policies:**
  - A provider is only marked `healthy` if: score ≥ 50, score has been updated in the last 5 minutes, it is not a simulated provider (`is_sim = false`), and it has no `CENSORING`, `DEVIANT`, or `STALE` incident recorded in the last 30 minutes.
  - If no providers meet the health criteria, the router falls back to a `status: DEGRADED` state and returns the least-bad active chain to avoid app deadlock (never returns empty or silently routes to bad nodes without warning).
  - The transparent proxy endpoint `/api/rpc` routes JSON-RPC requests, fails over automatically to the next best candidate on upstream error/timeout, and exposes `x-argus-routed-to` and `x-argus-route-status` headers.

### F-12 On-chain Attestation & Merkle Roots
- Contract `ArgusAttest` (Sepolia): Logs incident digests.
- **Hourly Merkle Roots:** Every hour, the server hashes the tree of all polls from that hour and commits the root on-chain. This proves the server didn't delete or edit historical polls.

### F-13 Interrogate Console & F-14 Adversary Simulator
- On-demand custom queries at pinned blocks.
- `/api/adversary` endpoint simulates `stale|mutate|censor` modes against a target provider for deterministic video recording.

### F-15 Database Persistence
- Supabase Postgres stores Providers, Polls, Incidents, and Scores.
- Provides 12h+ continuous history immediately upon site load.

### F-16 Verifiable Audit Engine (`/verify`)
- A dedicated page where a user selects an Incident ID or Poll ID.
- The page fetches the raw JSON evidence from the DB.
- It runs the exact same open-source consensus code in the browser.
- It compares: `Browser Math Result == Server Published Verdict == On-Chain Hash`.
- **AC:** Three green checkmarks prove the server is mathematically honest.

---

## 7. Data Model (core types)
```ts
Provider { id, url, label, operator, isSim }
Poll { id, t, battery: CheckResult[], pinnedBlockHex, consensusHash, merkleRoot? }
Incident { id, t, providerId, kind, pollId, request, expected, got, receipts }
```

## 8. Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Netlify serverless cron limits | Use external cron (cron-job.org) hitting a dedicated API route. |
| Supabase cold starts | Keep-alive ping every 5 minutes. |
| Skepticism of server-side math | `/verify` route + Merkle root commitments (F-12, F-16). |
