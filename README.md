This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
## Run the Argus heartbeat cron

Argus depends on an always-on heartbeat to keep `/api/poll` running. In serverless hosting (Netlify, Vercel, etc.), your app only executes when it receives a request. That means the heartbeat must come from an external scheduler, not from page visits.

### Required environment variables

- `CRON_SECRET` — a strong secret used by `/api/poll` for authentication.
- `POLL_URL` — the full deployed URL for the poll endpoint, for example `https://your-domain.com/api/poll`.

### Local helper script

This repo includes a small helper for pings:

```bash
POLL_URL="https://your-domain.com/api/poll" CRON_SECRET="your-secret" npm run ping-poll
```

### Scheduler requirements

- Method: `POST`
- URL: `https://your-domain.com/api/poll`
- Header: `x-cron-secret: your-secret`
- Optional: `Authorization: Bearer your-secret` if your scheduler requires it
- Frequency: every 20–30 seconds for continuous monitoring

### Recommended scheduler options

- External cron services like [cron-job.org](https://cron-job.org), [EasyCron](https://www.easycron.com), or [Healthchecks.io](https://healthchecks.io)
- A small container/VM running a shell loop
- Any hosted runner that can send HTTP requests on a 20–30 second interval

### Why this matters

The polling cron is mandatory because it:

1. keeps your serverless backend alive,
2. fills the 50-poll rolling window,
3. captures transient provider failures, and
4. creates the raw data used by hourly Merkle roots.

Without it, Argus cannot operate as a true 24/7 monitor.
