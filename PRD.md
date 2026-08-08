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
- **C3 Continuity:** provider's current block `parentHash` must equal its previous poll's block `hash`.
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
  - A provider is only marked `healthy` if: score $\ge$ 50, score has been updated in the last 5 minutes, it is not a simulated provider (`is_sim = false`), and it has no `CENSORING`, `DEVIANT`, or `STALE` incident recorded in the last 30 minutes.
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

---

## Appendix A: Strategic & Feature Decision Record

*Every choice below lists the reason for choosing it and the reason for rejecting alternatives. This document doubles as your README "Why" section and your judge Q&A prep.*

---

### A. Strategic decisions

**A1 — Compete in Track 2 (Censorship Resistance), not 1 or 3.**
✅ Reason: entry density. Tracks 1 and 3 match skills students already have (wallets, dApps), so they attract the most submissions; infra "sounds scary" and stays sparse. One prize per track ⇒ same effort, higher odds.
❌ Track 1/3 rejected because: you'd be one of fifteen AA-wallet/voting-dApp clones; differentiation cost would be enormous.

**A2 — Build an angle *not* listed in the track's example bullets.**
✅ Reason: the bullets are handed to every participant; judges will see dozens of literal implementations. An adjacent, unlisted angle reads as original thinking while still mapping to the track's wording.
❌ Literal bullet builds rejected because: best case you're "the better revoke.cash", which is a comparison you can lose on polish alone.

**A3 — Scope philosophy: "core perfect, extras if green".**
✅ Reason: judging is binary on *working demo*; a complete-but-flaky feature set loses to a smaller flawless one.
❌ Maximalist scope rejected because: 12h is fixed; every unfinished feature actively damages the demo.

---

### B. Feature decisions (chosen / rejected / why)

**F-01 Registry (built-ins + add-your-own + labeled SIMs + static operator map)**
✅ Built-ins: judges must see a live system with zero setup.
✅ Add-your-own: converts demo → tool ("we polygraph *your* Alchemy key") at ~30 min cost.
✅ Labeled SIM presets: controlled demo without lying about what's real — the trust narrative forbids blurring real/simulated.
✅ *Static* operator map: independence weighting needs operator knowledge; a static map of ~10 known providers is accurate, explainable, dependency-free.
❌ On-chain registry rejected: sybil attacks + deployment complexity for zero demo value.
❌ Auto-discovery (scrape chainlist) rejected: unknown CORS/rate limits → unstable demo.
❌ ASN/geo lookup rejected: external dependency, slow, and overkill for a known provider set.

**F-02 Polling engine via server proxy**
✅ Proxy (`/api/proxy`): many public RPCs send no CORS headers; proxy also centralizes normalization and hides user keys.
✅ 20-30s cadence: faster trips public rate limits; slower makes the dashboard look dead. Fits serverless limits.
✅ ≥5 responses for a valid poll: below 5, two liars can out-vote honesty; 5 is the statistical floor.
❌ Direct browser calls rejected: CORS failures mid-demo.
❌ WebSockets rejected: public RPCs rarely expose WS; reconnection logic = hours.
✅ Cron/background jobs: required to build 12h+ continuous history before judging; external cron pings Netlify API route to keep DB hot.

**F-03 Check battery**
✅ C1 `getBalance` pinned: canonical value that's a raw hex string — zero normalization pitfalls, universally supported.
✅ C2 compare only `(hash, parentHash, stateRoot, transactionsRoot)`: Geth/Erigon/Reth return *different extra fields*; full-object comparison guarantees false positives. These four fields are exactly the consensus-critical ones.
✅ C3 continuity check: a block whose `parentHash` doesn't chain is a *cryptographic* lie — needs no vote. This single feature answers the hardest judge question.
✅ C4 freshness kept separate from honesty: lag is a service defect, not dishonesty; conflating them punishes slow-but-honest nodes and corrupts the integrity metric.
✅ C5 write-path probe: censorship is invisible to reads; differential accept/reject is the only client-side observable.
❌ `eth_getProof` verification rejected: proofs verify against a header you must *trust* → requires a light client (NG2, out of 12h).
❌ Mempool comparison rejected: needs a full node — the exact heaviness we're avoiding.
❌ `"latest"`-tag queries rejected: propagation delay makes honest nodes disagree → false accusations. **Pinning to `finalized` is what makes "lying" objectively definable.**

**F-04 Consensus voting**
✅ Weighted majority (`independence × reputation`): one operator running 4 endpoints must not equal 4 votes; proven liars must have less say.
✅ `INCONCLUSIVE` state: a trust product dies on one false accusation; saying "don't know" is always safer than accusing wrong. Misses recover next poll; false flags don't.
✅ Retry 2× before accusing: 1 retry still coincides with blips; 3+ delays detection; 2 is the balance.
❌ Naive majority rejected: collusion flaw. ❌ Fastest-wins (FallbackProvider model) rejected: no correctness notion at all. ❌ Unanimity rejected: one flaky node deadlocks every poll.

**F-06 Scoring**
✅ Windowed (W=50), not cumulative: providers must be able to *improve* (your "repeating vs improving" requirement); cumulative history also implies a database (NG1).
✅ Weights 0.5 accuracy / 0.2 uptime / 0.15 latency / 0.15 freshness: honesty *is* the product (dominant); a dead RPC is useless (second); the rest are QoS tie-breakers. One sentence, fully explainable.
❌ Penalty-point scheme (−25/+1) rejected: arbitrary constants, unnormalized, hard to defend in Q&A.

**F-07/08 Leaderboard + provider drawer**
✅ Comparable-at-a-glance output: judges skim; sortable columns give interactivity for free.
❌ Geo-map visualization rejected: high cost, zero judgment value.
❌ Public name-and-shame/tweet-bot rejected: reputational liability; judges dislike vigilantism.

**F-09 Evidence drawer**
✅ Three receipts for three skeptic types: attestation tx (crypto-native), explorer link (human), reproducible curl (engineer). Without these, Argus is just another untrusted claimant.
✅ Pin evidence to explicit block *hex*: the `"finalized"` tag drifts with time; a hex number freezes the check forever.
❌ Screenshots as evidence rejected: forgeable. ❌ Full responses on-chain rejected: gas-absurd. ❌ IPFS storage rejected: extra dependency; explorer+curl already suffice.

**F-11 Router**
✅ Integrity-first routing: a censoring provider is often *fast* (does less work); latency-only routing would route you into the liar.
❌ Observation-only (no router) rejected: that's a dashboard, and dashboards already exist — the user value is *protection*.

**F-12 Attestation contract**
✅ Digest-only on-chain: tamper-proof claim history at ~zero gas; full evidence stays off-chain and reproducible.
✅ Also proves real Ethereum usage — judges check this.
❌ Evidence strings on-chain rejected: gas. ❌ Merkle/rollup of verdicts rejected: overkill. ❌ Mainnet deploy rejected: cost + risk for no demo benefit.

**F-13 Interrogate console**
✅ Turns passive demo into dialogue; judges poke it themselves; reuses existing engine (~cheap).

**F-14 Adversary simulator**
✅ Real censorship will not conveniently occur during your 2-minute video; the simulator makes the wow-moment deterministic. Doubles as dev test harness.
❌ Provoking real censorship (tx to sanctioned addresses) rejected: legal/ethical hazard, could get your EOA flagged.

**F-15 Database persistence**
✅ Supabase Database Persistence: survives refresh, provides historical record, honest 12h+ window.
❌ localStorage only rejected: loses historical context on refresh.

---

### C. Constants & their reasons

| Constant | Value | Reason |
|---|---|---|
| Poll interval | 20-30s | liveness vs serverless execution and public rate limits |
| Provider timeout | 3s | above healthy p95 (~1–2s); dead nodes can't stall a poll |
| Min participation | 5 | below this, weighted consensus is meaningless |
| STALE threshold | lag ≥ 2 | 1-block lag = normal propagation; 2+ = structural |
| Window W | 50 polls | ≈15-25 min at 20-30s: long enough to show trend, short enough to react; fits Supabase easily |
| Trend thresholds | ±5 | filters single-incident noise; requires sustained change |
| C5 probe frequency | every 10th poll | write probes cost nonce+gas+rate headroom; 1/10 keeps signal cheap |
| latencyScore span | 1500ms | real-world spread of public RPCs; sensitive in-range, saturated beyond |

---

### D. Tech stack & reasons

| Layer | Choice | Why this | Why not alternatives |
|---|---|---|---|
| Framework | **Next.js (App Router)** | One repo serves dashboard + proxy + adversary endpoint; instant deploy; LLMs are maximally fluent in it | Vite+Express = two deploys + CORS glue; plain React = no server layer for the proxy |
| Language | **TypeScript** | JSON-RPC is a typed protocol; compile-time catches demo-day bugs; AI writes safer TS | JS = runtime surprises mid-demo; Python backend = second language, second deploy |
| Styling/UI | **Tailwind + shadcn/ui** | Fast, consistent, accessible; `design.md` can reskin without touching logic | MUI = generic look, heavy; hand-rolled CSS = hours |
| Charts | **recharts** | Sensible defaults, shipped in an hour | D3/visx = custom-everything, time sink |
| Eth lib | **viem** | Typed, tree-shakeable, trivial multi-client fan-out (`createClient` per provider) | web3.js = legacy/heavy; ethers = fine, but viem's surface area produces fewer surprises |
| Hashing | **Web Crypto / node:crypto** | sha256 with zero dependencies | npm hash libs = unnecessary supply chain |
| Contracts | **Foundry (forge)** | 20-line contract compiles+deploys in minutes; verifier API for explorer | Hardhat = slower setup for one contract |
| Chain | **Sepolia** (writes/probes) + optional mainnet reads | Free faucet, real explorer for judges, zero financial risk | Mainnet writes = cost+risk; Base Sepolia acceptable substitute — pick one, never both |
| Hosting | **Netlify** | Zero-config Next.js deployment with Netlify Functions for API routes | Vercel = rejected due to platform requirements |
| Persistence | **Supabase DB** | Free-tier Postgres database with simple REST API, perfect for 12h build | LocalStorage only = rejected as it loses history on refresh |
| Demo tooling | **OBS + CapCut** | 1080p capture, tight cuts, captions | Screen-stutter recordings kill perceived quality |
| Build workflow | **Cursor/Claude** | The stack above was *chosen for LLM fluency* — exotic tools degrade AI output quality | Any niche framework = AI hallucination tax |

---

### E. The one-line meta-reason

Every decision optimizes the same function: **maximize judge-perceived credibility per hour spent** — evidence over visuals, reproducibility over claims, controlled demos over live luck, and explainable math over clever math. If a choice can't be defended aloud in one sentence, it didn't make this document.

---

## Appendix B: Built-in Registry and Pre-ship Test

*This appendix details the default providers for Mainnet and Sepolia, the configuration shape, and pre-ship check instructions.*

---

### A. Mainnet defaults (8)

| Provider | Endpoint | Operator (independence group) | Notes |
|---|---|---|---|
| Cloudflare | `https://cloudflare-eth.com` | cloudflare | CORS-friendly, stable |
| LlamaNodes | `https://eth.llamarpc.com` | llamanodes | fast public tier |
| PublicNode | `https://ethereum.publicnode.com` | grove/pokt | privacy-first branding |
| dRPC | `https://eth.drpc.org` | drpc | **aggregator** — tag `type: aggregator` in drawer |
| 1RPC | `https://1rpc.io/eth` | automata | privacy relay (strips IPs) |
| BlastAPI | `https://eth-mainnet.public.blastapi.io` | blast | solid public tier |
| Tenderly | `https://mainnet.gateway.tenderly.co` | tenderly | keyless = rate-limited public tier |
| OnFinality | `https://eth.api.onfinality.io/public` | onfinality | good fallback |

**Send-path specialists (router's "clean route" candidates):**
- Flashbots Protect — `https://rpc.flashbots.net` → operator **flashbots**
- MEV Blocker — `https://rpc.mevblocker.io` → operator **flashbots** (same group! one vote between them)

*Optional spares:* BlockPI `https://ethereum.blockpi.network/v1/rpc/public`, Ankr `https://rpc.ankr.com/eth` (increasingly key-gated — test first).

---

### B. Sepolia defaults (7)

| Provider | Endpoint | Operator |
|---|---|---|
| Sepolia core | `https://rpc.sepolia.org` | sepolia-core |
| Tenderly | `https://sepolia.gateway.tenderly.co` | tenderly |
| PublicNode | `https://ethereum-sepolia-rpc.publicnode.com` | grove/pokt |
| dRPC | `https://sepolia.drpc.org` | drpc |
| BlastAPI | `https://eth-sepolia.public.blastapi.io` | blast |
| 1RPC | `https://1rpc.io/sepolia` | automata |
| Liquify | `https://rpc.sepolia.liquify.io` | liquify |

---

### C. "Add your own" (key-gated, not built-in)
Alchemy / Infura / QuickNode / Nodereal free tiers — this is exactly what your F-01 add-provider form is for.

---

### D. Config shape (paste into Cursor)

```ts
const PROVIDERS = [
  { id: "cloudflare", url: "https://cloudflare-eth.com", operator: "cloudflare", type: "node" },
  { id: "llama",      url: "https://eth.llamarpc.com",   operator: "llamanodes", type: "node" },
  { id: "publicnode", url: "https://ethereum.publicnode.com", operator: "grove", type: "node" },
  { id: "drpc",       url: "https://eth.drpc.org",       operator: "drpc",  type: "aggregator" },
  { id: "1rpc",       url: "https://1rpc.io/eth",        operator: "automata", type: "relay" },
  { id: "blast",      url: "https://eth-mainnet.public.blastapi.io", operator: "blast", type: "node" },
  { id: "tenderly",   url: "https://mainnet.gateway.tenderly.co", operator: "tenderly", type: "node" },
  { id: "onfinality", url: "https://eth.api.onfinality.io/public", operator: "onfinality", type: "node" },
  { id: "flashbots",  url: "https://rpc.flashbots.net",  operator: "flashbots", type: "send" },
  { id: "mevblocker", url: "https://rpc.mevblocker.io",  operator: "flashbots", type: "send" },
];
```

---

### E. Pre-ship test (run for every endpoint, 2 minutes total)

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_blockNumber","params":[]}' \
  https://cloudflare-eth.com
```

Check 4 things:
1. Returns `result` hex.
2. Accepts an **explicit block hex** in `eth_getBalance` (engine resolves pinned block once per poll and sends hex to all, sidestepping `"finalized"`-tag differences).
3. No 429 after 20 rapid requests (cadence is ~0.6 req/s per provider, well inside public limits).
4. Drop any endpoint that fails — keep the pool at 8–10, never pad with flaky ones (a DOWN-heavy pool dilutes consensus).

---

### F. Operator-map gotchas for Q&A
- **dRPC/1RPC are aggregators/relays**: A deviation from them may be a downstream vendor's fault — score them anyway (the user cares about the endpoint they called), but the `type` tag makes you look precise.
- **Flashbots + MEV Blocker share one operator**: Independence weighting must count them as a single vote — exactly the collusion case your F-04 exists for.

---

## Appendix C: Server-Side Architecture & Cryptographic Verifiability

### A. The Core Philosophy: The Server is a Reporter, Not a Judge
A common critique of server-side monitoring is: *"If a server tells me an RPC is lying, why should I trust the server?"* 
Argus solves this by separating **Recording** from **Judging**. 
- The **Server** is a Reporter: It fetches raw JSON from RPCs and saves it exactly as received.
- The **Ethereum Chain** is a Notary: It stores immutable hashes of the server's raw data.
- The **`/verify` Route** is the Judge: Anyone can download the raw data and run the open-source consensus math in their own browser to verify the server's claims.

### B. The 3-Step Proof of Legitimacy
1. **Raw Evidence is Public:** Every poll stores the exact request (pinned block hex) and each provider's raw response. Published at `/api/evidence`.
2. **History is Anchored:** The server cannot silently edit or delete history because hourly Merkle roots of all polls are committed to `ArgusAttest`.
3. **Anyone Can Recompute:** Verdicts and scores are pure functions of the evidence. The `/verify` page recomputes the math and compares it to the on-chain hash. If they match, the server provably didn't manipulate the data.

### C. Why Server-Side Wins for this Hackathon
1. **Real Continuous History:** Unlike client-side tools that lose memory on refresh, the Supabase DB provides judges with 12+ hours of real, continuous monitoring history the moment they open the URL.
2. **Stable Vantage Point:** Eliminates false positives caused by a user's bad Wi-Fi or local ISP routing.
3. **No CORS Nightmares:** Server-to-server RPC calls bypass browser CORS restrictions entirely, ensuring the demo never breaks due to network policies.

### D. The Judge Q&A One-Liner
> *"We made the server a witness, not a judge. It records what RPCs say, anchors the record on-chain, and anyone can re-run our open-source math on that record in their own browser via the `/verify` button. A server that can't lie undetectably is more trustworthy than a client that just promises not to."*
