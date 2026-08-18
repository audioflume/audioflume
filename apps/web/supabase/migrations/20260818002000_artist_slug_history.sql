-- Preserve previous artist slugs so old public artist URLs can redirect after slug changes.

create table if not exists public.artist_slug_history (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  slug text not null,
  created_at timestamptz not null default now(),

  constraint artist_slug_history_slug_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

create unique index if not exists artist_slug_history_slug_lower_idx
  on public.artist_slug_history (lower(slug));

create index if not exists artist_slug_history_artist_idx
  on public.artist_slug_history (artist_id);

alter table public.artist_slug_history enable row level security;

grant select, insert, update, delete on table public.artist_slug_history to service_role;
