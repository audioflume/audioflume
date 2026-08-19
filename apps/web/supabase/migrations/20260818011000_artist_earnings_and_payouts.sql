create table if not exists public.artist_earnings (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  source text not null check (source in ('premium_license', 'bespoke', 'subscription', 'enterprise', 'adjustment', 'other')),
  status text not null default 'available' check (status in ('pending', 'available', 'void')),
  description text,
  gross_amount_cents bigint check (gross_amount_cents is null or gross_amount_cents >= 0),
  artist_amount_cents bigint not null check (artist_amount_cents <> 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  earned_at timestamptz not null default now(),
  period_start date,
  period_end date,
  reference_type text,
  reference_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint artist_earnings_period_order check (
    period_start is null or period_end is null or period_end >= period_start
  )
);

create index if not exists artist_earnings_artist_earned_idx
  on public.artist_earnings (artist_id, earned_at desc);
create index if not exists artist_earnings_artist_status_currency_idx
  on public.artist_earnings (artist_id, status, currency);

create table if not exists public.artist_payouts (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending' check (status in ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  method_label text,
  external_reference text,
  note text,
  requested_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists artist_payouts_artist_created_idx
  on public.artist_payouts (artist_id, created_at desc);
create index if not exists artist_payouts_artist_status_currency_idx
  on public.artist_payouts (artist_id, status, currency);

alter table public.artist_earnings enable row level security;
alter table public.artist_payouts enable row level security;

revoke all on table public.artist_earnings from anon, authenticated;
revoke all on table public.artist_payouts from anon, authenticated;
grant select, insert, update, delete on table public.artist_earnings to service_role;
grant select, insert, update, delete on table public.artist_payouts to service_role;
