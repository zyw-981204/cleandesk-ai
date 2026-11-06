-- CleanDesk AI schema for BrightHarbor Cleaning (fictional demo data).
-- Embeddings use 1024 dimensions, the default size of DashScope text-embedding-v3.
-- The Next.js server uses the service role key. RLS is enabled with no policies
-- for the public Data API roles, and their grants are revoked.

create extension if not exists vector with schema extensions;

create table if not exists public.services (
  slug text primary key,
  name text not null,
  summary text not null,
  includes jsonb not null default '[]'::jsonb,
  base_cents integer not null,
  per_sqft_cents integer not null,
  per_bedroom_cents integer not null,
  per_bathroom_cents integer not null,
  duration_hours integer not null
);

create table if not exists public.addons (
  slug text primary key,
  name text not null,
  summary text not null,
  price_cents integer not null
);

create table if not exists public.service_areas (
  id text primary key,
  city text not null,
  region text not null,
  postal_codes text[] not null,
  note text not null
);

create table if not exists public.cleaners (
  id text primary key,
  name text not null,
  focus text not null
);

create table if not exists public.customers (
  id text primary key,
  name text not null,
  email text not null,
  phone text not null,
  address_line text not null,
  city text not null,
  postal_code text not null,
  sqft integer not null,
  bedrooms integer not null,
  bathrooms integer not null
);

create table if not exists public.time_slots (
  id text primary key,
  cleaner_id text not null references public.cleaners (id),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null check (status in ('open', 'booked'))
);

create index if not exists time_slots_starts_at_idx on public.time_slots (starts_at);
create index if not exists time_slots_status_idx on public.time_slots (status);

create table if not exists public.bookings (
  id text primary key,
  customer_id text not null references public.customers (id),
  service_slug text not null references public.services (slug),
  addon_slugs text[] not null default '{}',
  slot_id text not null references public.time_slots (id),
  status text not null check (status in ('confirmed', 'rescheduled', 'cancelled')),
  quote_cents integer not null,
  sqft integer not null,
  bedrooms integer not null,
  bathrooms integer not null,
  postal_code text not null,
  address_line text not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists bookings_status_idx on public.bookings (status);
create index if not exists bookings_created_at_idx on public.bookings (created_at desc);

create table if not exists public.kb_chunks (
  id text primary key,
  source text not null,
  title text not null,
  content text not null,
  embedding extensions.vector(1024)
);

create index if not exists kb_chunks_embedding_idx
  on public.kb_chunks using hnsw (embedding extensions.vector_cosine_ops);

create table if not exists public.chat_logs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  tool_name text not null,
  args jsonb,
  result jsonb,
  status text not null check (status in ('executed', 'proposed', 'committed', 'error')),
  created_at timestamptz not null default now()
);

create index if not exists chat_logs_created_at_idx on public.chat_logs (created_at desc);

create or replace function public.match_kb_chunks(
  query_embedding extensions.vector(1024),
  match_count integer default 4
)
returns table (
  id text,
  source text,
  title text,
  content text,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    kb_chunks.id,
    kb_chunks.source,
    kb_chunks.title,
    kb_chunks.content,
    1 - (kb_chunks.embedding <=> query_embedding) as similarity
  from public.kb_chunks
  where kb_chunks.embedding is not null
  order by kb_chunks.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

alter table public.services enable row level security;
alter table public.addons enable row level security;
alter table public.service_areas enable row level security;
alter table public.cleaners enable row level security;
alter table public.customers enable row level security;
alter table public.time_slots enable row level security;
alter table public.bookings enable row level security;
alter table public.kb_chunks enable row level security;
alter table public.chat_logs enable row level security;

revoke all on table public.services from anon, authenticated;
revoke all on table public.addons from anon, authenticated;
revoke all on table public.service_areas from anon, authenticated;
revoke all on table public.cleaners from anon, authenticated;
revoke all on table public.customers from anon, authenticated;
revoke all on table public.time_slots from anon, authenticated;
revoke all on table public.bookings from anon, authenticated;
revoke all on table public.kb_chunks from anon, authenticated;
revoke all on table public.chat_logs from anon, authenticated;
revoke all on function public.match_kb_chunks(extensions.vector, integer) from public, anon, authenticated;
grant execute on function public.match_kb_chunks(extensions.vector, integer) to service_role;
