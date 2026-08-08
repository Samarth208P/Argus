-- ============================================================
-- Argus Database Schema — Supabase Postgres
-- Run this in Supabase SQL Editor
-- ============================================================

-- Providers table
create table if not exists providers (
  id          text primary key,
  url         text not null,
  label       text not null,
  operator    text not null,
  type        text not null default 'node',
  is_sim      boolean not null default false,
  network     text not null default 'mainnet',
  created_at  timestamptz not null default now()
);

-- Polls table
create table if not exists polls (
  id               uuid primary key default gen_random_uuid(),
  t                timestamptz not null default now(),
  battery          jsonb not null,
  pinned_block_hex text not null,
  consensus_hash   text,
  merkle_root      text,
  status           text not null default 'ok'
);

-- Incidents table
create table if not exists incidents (
  id          uuid primary key default gen_random_uuid(),
  t           timestamptz not null default now(),
  provider_id text references providers(id),
  kind        text not null, -- DEVIANT | STALE | CENSORING | DOWN
  poll_id     uuid references polls(id),
  request     jsonb,
  expected    text,
  got         text,
  receipts    jsonb
);

-- Scores table (rolling W=50 window per provider)
create table if not exists scores (
  id              uuid primary key default gen_random_uuid(),
  t               timestamptz not null default now(),
  provider_id     text references providers(id),
  score           int not null,
  accuracy        float not null,
  uptime          float not null,
  latency_avg     float not null,
  freshness_score float not null,
  trend           text not null default 'STABLE'
);

-- Indexes for performance
create index if not exists idx_polls_t on polls(t desc);
create index if not exists idx_incidents_t on incidents(t desc);
create index if not exists idx_incidents_provider on incidents(provider_id);
create index if not exists idx_scores_provider_t on scores(provider_id, t desc);

-- ============================================================
-- RLS (Row Level Security) - Read-only for public
-- ============================================================
-- Enable RLS
alter table providers enable row level security;
alter table polls enable row level security;
alter table incidents enable row level security;
alter table scores enable row level security;

-- Create policies for public reads
create policy "Allow public read access on providers" on providers for select using (true);
create policy "Allow public read access on polls" on polls for select using (true);
create policy "Allow public read access on incidents" on incidents for select using (true);
create policy "Allow public read access on scores" on scores for select using (true);

-- (Writes are done by the API using the Service Role Key, which bypasses RLS)

-- ============================================================
-- Realtime subscriptions
-- ============================================================
-- Enable Realtime for tables that drive UI updates
alter publication supabase_realtime add table incidents;
alter publication supabase_realtime add table scores;
alter publication supabase_realtime add table polls;
alter table incidents replica identity full;
alter table scores replica identity full;
alter table polls replica identity full;

-- ============================================================
-- Seed Data: Built-in Mainnet Providers
-- ============================================================
insert into providers (id, url, label, operator, type, network)
values 
  ('cloudflare', 'https://cloudflare-eth.com', 'Cloudflare', 'cloudflare', 'node', 'mainnet'),
  ('llama', 'https://eth.llamarpc.com', 'LlamaNodes', 'llamanodes', 'node', 'mainnet'),
  ('publicnode', 'https://ethereum.publicnode.com', 'PublicNode', 'grove', 'node', 'mainnet'),
  ('drpc', 'https://eth.drpc.org', 'dRPC', 'drpc', 'aggregator', 'mainnet'),
  ('1rpc', 'https://1rpc.io/eth', '1RPC', 'automata', 'relay', 'mainnet'),
  ('blast', 'https://eth-mainnet.public.blastapi.io', 'BlastAPI', 'blast', 'node', 'mainnet'),
  ('tenderly', 'https://mainnet.gateway.tenderly.co', 'Tenderly', 'tenderly', 'node', 'mainnet'),
  ('onfinality', 'https://eth.api.onfinality.io/public', 'OnFinality', 'onfinality', 'node', 'mainnet'),
  ('flashbots', 'https://rpc.flashbots.net', 'Flashbots Protect', 'flashbots', 'send', 'mainnet'),
  ('mevblocker', 'https://rpc.mevblocker.io', 'MEV Blocker', 'flashbots', 'send', 'mainnet')
on conflict (id) do nothing;
