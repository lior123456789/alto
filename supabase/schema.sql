-- Run this in your Supabase project's SQL editor.

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  created_at timestamptz default now()
);

create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  session_id text not null unique,
  vertical text not null,
  messages jsonb default '[]',
  user_profile jsonb default '{}',
  status text default 'active',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid references conversations(id) on delete cascade,
  provider text not null,
  vertical text not null,
  quote_data jsonb not null,
  monthly_price numeric,
  selected boolean default false,
  created_at timestamptz default now()
);

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  conversation_id text,
  quote_id uuid references quotes(id) on delete set null,
  provider text not null,
  vertical text,
  status text default 'clicked',
  referral_fee numeric,
  -- EverQuote-specific
  everquote_uuid text,
  bid_cents integer,
  duration_seconds integer,
  converted_at timestamptz,
  created_at timestamptz default now()
);

-- Earnings rollup view (run after the leads table exists)
create or replace view alto_earnings as
select
  date_trunc('day', created_at) as day,
  count(*) as total_leads,
  count(*) filter (where status = 'accepted') as accepted_leads,
  coalesce(sum(bid_cents) filter (where status = 'accepted'), 0) / 100.0 as earned_dollars
from leads
where provider = 'everquote'
group by 1
order by 1 desc;

create index if not exists idx_conversations_session on conversations(session_id);
create index if not exists idx_leads_conversation on leads(conversation_id);
create index if not exists idx_leads_status on leads(status);
