create table if not exists public.artist_team_invitations (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  email text not null,
  role text not null,
  status text not null default 'pending',
  clerk_invitation_id text,
  invited_by_clerk_user_id text references public.user_profiles(clerk_user_id) on delete set null,
  accepted_by_clerk_user_id text references public.user_profiles(clerk_user_id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint artist_team_invitations_email_check
    check (length(btrim(email)) > 0),
  constraint artist_team_invitations_role_check
    check (role in ('manager', 'editor', 'viewer')),
  constraint artist_team_invitations_status_check
    check (status in ('pending', 'accepted', 'revoked'))
);

create unique index if not exists artist_team_invitations_pending_email_idx
  on public.artist_team_invitations (artist_id, lower(email))
  where status = 'pending';
create index if not exists artist_team_invitations_artist_status_idx
  on public.artist_team_invitations (artist_id, status, created_at desc);

-- Reuse the account migration's shared updated_at trigger function.
drop trigger if exists set_artist_team_invitations_updated_at on public.artist_team_invitations;
create trigger set_artist_team_invitations_updated_at
before update on public.artist_team_invitations
for each row execute function public.set_updated_at();

alter table public.artist_team_invitations enable row level security;

revoke all on table public.artist_team_invitations from anon, authenticated;
grant select, insert, update, delete on table public.artist_team_invitations to service_role;
