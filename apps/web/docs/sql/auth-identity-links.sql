-- Staged Clerk -> Supabase identity linking.
-- New table only. Does not alter legacy ownership keys or existing rows.
-- Server-only: no anon/authenticated Data API permissions or user-facing policies.
create table if not exists public.auth_identity_links (
  supabase_user_id uuid primary key references auth.users(id) on delete restrict,
  clerk_user_id text not null unique,
  linked_at timestamptz not null default now(),
  constraint auth_identity_links_clerk_id_not_empty check (length(trim(clerk_user_id)) > 0)
);

alter table public.auth_identity_links enable row level security;

revoke all on table public.auth_identity_links from public, anon, authenticated;
grant select, insert on table public.auth_identity_links to service_role;

comment on table public.auth_identity_links is
  'Server-verified one-to-one mapping between Supabase Auth UUIDs and legacy Clerk user IDs. No direct client access.';
