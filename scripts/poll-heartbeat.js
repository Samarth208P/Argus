#!/usr/bin/env node
const url = process.env.POLL_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api/poll` : "http://localhost:3000/api/poll";
const secret = process.env.CRON_SECRET;

if (!secret) {
  console.error("Missing CRON_SECRET environment variable.");
  process.exit(1);
}

if (!url) {
  console.error("Missing POLL_URL environment variable.");
  process.exit(1);
}

async function main() {
  console.log(`Sending heartbeat to ${url}`);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": secret,
      },
    });

    const body = await res.text();
    console.log(`Status: ${res.status}`);
    console.log(body);
    if (!res.ok) {
      process.exit(2);
    }
  } catch (err) {
    console.error(`Failed to ping ${url}:`, err);
    process.exit(3);
  }
}

main();
