<div align="center">

<h1><img src="public/argus-logo.svg" alt="Argus logo" height="26" align="top" />&nbsp; Argus</h1>

### A lie detector for Ethereum RPCs

Argus continuously cross-examines every RPC provider against live consensus,
catches stale data, mutated state and censored transactions the moment they
happen, and publishes cryptographic evidence anyone can verify.

**🌐 Live demo → [tryargus.netlify.app](https://tryargus.netlify.app)**

<sub>Built for the Censorship Resistance track · Road to Devcon 2026 · IIT Roorkee</sub>

</div>

---

## What it does

Not every RPC tells the truth. A provider can be fast *and* dishonest — serving
a stale block, a mutated balance, or silently dropping a transaction. Argus is
your independent second opinion:

- **Monitor** — polls every registered RPC continuously and records exactly what each one claims.
- **Detect** — isomorphic consensus math compares responses and flags any provider that deviates (`DEVIANT` / `STALE` / `CENSORING` / `DOWN`).
- **Prove** — each detection ships a signed evidence bundle, Merkle-committed on Sepolia. Recompute it in your own browser and check it against the chain.
- **Route** — an integrity-first router sends traffic to verified-honest endpoints, not merely fast ones.

Providers are graded on an **integrity score** (0–100) derived from accuracy,
uptime, latency and freshness — the single source of truth for every ranking.

## Drop-in RPC endpoint

Argus exposes one URL that routes every call to the current best-performing
provider, with automatic failover:

```
https://tryargus.netlify.app/api/rpc
```

Point any wallet or app at it like a normal Ethereum JSON-RPC endpoint.

## Pages & API

| Route | What it is |
| --- | --- |
| `/` | Landing — current best RPC + live comparison graph |
| `/rpcs` | Full leaderboard with live rank-change animations, filters and sorting |
| `/rpcs/[id]` | Per-provider details: score / latency / rank history |
| `/verify` | Paste an incident ID, recompute the consensus math, check it on-chain |
| `/api/rpc` | Integrity-first routed JSON-RPC endpoint (`POST`) |
| `/api/router/best` | Current routing decision |
| `/api/scores` | Latest integrity score per provider |
| `/api/evidence` | Raw signed evidence bundles |
| `/api/poll/sync` | Persists a poll batch |

## Tech stack

- **Next.js 16** (App Router) · **React 19** · **TypeScript**
- **Tailwind CSS v4** · **Motion** (Framer) · **Phosphor Icons** — hand-built SVG data-viz
- **Supabase** (optional; falls back to a local JSON store) · **viem** · **mathjs**

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app runs out of the box
with a seeded local data store — no external services required.

### Environment variables (optional)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase (browser) — realtime + reads |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase (server) — writes |
| `NEXT_PUBLIC_ARGUS_ATTEST_ADDRESS` | Deployed `ArgusAttest` contract (Sepolia) |
| `CRON_SECRET` | Shared secret for an external monitoring scheduler |

Without Supabase, Argus persists to a local JSON store under `cache/` and stays
fully functional for local development and demos.

## Continuous monitoring

Live scores are measured in the browser and persisted via `/api/poll/sync`. For
always-on **server-side** monitoring on serverless hosting (Netlify/Vercel),
drive an external scheduler (e.g. [cron-job.org](https://cron-job.org),
[EasyCron](https://www.easycron.com)) to hit the sync endpoint on a 20–30s
interval, authenticated with `CRON_SECRET`. This keeps the rolling window full,
captures transient failures, and feeds the hourly on-chain Merkle roots.

## Scripts

```bash
npm run dev     # start the dev server
npm run build   # production build
npm run start   # serve the production build
npm run lint    # lint
```

---

<div align="center">
<sub>Argus — because censorship resistance means nothing if you can't tell when you're being censored.</sub>
</div>
