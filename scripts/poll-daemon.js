const fs = require('fs');
const path = require('path');

// Load environment variables from .env file if it exists (for local development)
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const dotenvContent = fs.readFileSync(envPath, 'utf8');
  dotenvContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}/api/poll`;
const SECRET = process.env.CRON_SECRET || 'argus-cron-secret-12345';
const INTERVAL_MS = 20000; // 20 seconds

console.log(`[Daemon] Started. Will ping ${URL} every 20s...`);

async function runPoll() {
  try {
    const res = await fetch(URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-cron-secret": SECRET,
      },
    });
    const text = await res.text();
    console.log(`[Daemon] Poll completed. Status: ${res.status}. Response: ${text.slice(0, 150)}...`);
  } catch (err) {
    console.warn(`[Daemon] Poll failed (server might still be booting):`, err.message);
  }
}

// Initial delay to let Next.js boot
setTimeout(() => {
  runPoll();
  setInterval(runPoll, INTERVAL_MS);
}, 10000); // 10s boot delay
