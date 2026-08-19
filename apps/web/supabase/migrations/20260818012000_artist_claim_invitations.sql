create unique index if not exists artist_memberships_one_owner_idx
  on public.artist_memberships (artist_id)
  where role = 'owner';

create table if not exists public.artist_claim_invitations (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  email text not null,
  status text not null default 'pending',
  clerk_invitation_id text,
  invited_by_clerk_user_id text references public.user_profiles(clerk_user_id) on delete set null,
  claimed_by_clerk_user_id text references public.user_profiles(clerk_user_id) on delete set null,
  expires_at timestamptz not null default (now() + interval '30 days'),
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint artist_claim_invitations_email_check
    check (length(btrim(email)) > 0),
  constraint artist_claim_invitations_status_check
    check (status in ('pending', 'claimed', 'revoked', 'expired'))
);

create unique index if not exists artist_claim_invitations_pending_artist_idx
  on public.artist_claim_invitations (artist_id)
  where status = 'pending';
create index if not exists artist_claim_invitations_email_status_idx
  on public.artist_claim_invitations (lower(email), status, created_at desc);
create index if not exists artist_claim_invitations_artist_created_idx
  on public.artist_claim_invitations (artist_id, created_at desc);

drop trigger if exists set_artist_claim_invitations_updated_at on public.artist_claim_invitations;
create trigger set_artist_claim_invitations_updated_at
before update on public.artist_claim_invitations
for each row execute function public.set_updated_at();

alter table public.artist_claim_invitations enable row level security;

revoke all on table public.artist_claim_invitations from anon, authenticated;
grant select, insert, update, delete on table public.artist_claim_invitations to service_role;

create or replace function public.claim_artist_invitation(
  p_invitation_id uuid,
  p_clerk_user_id text,
  p_email text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_artist_id uuid;
  v_existing_role text;
begin
  if length(btrim(coalesce(p_clerk_user_id, ''))) = 0 then
    raise exception 'User is required';
  end if;

  if length(btrim(coalesce(p_email, ''))) = 0 then
    raise exception 'Email is required';
  end if;

  select invitation.artist_id
    into v_artist_id
  from public.artist_claim_invitations invitation
  where invitation.id = p_invitation_id
    and invitation.status = 'pending'
    and invitation.expires_at > now()
    and lower(invitation.email) = lower(btrim(p_email))
  for update;

  if v_artist_id is null then
    raise exception 'Claim invitation is invalid or expired';
  end if;

  if exists (
    select 1
    from public.artist_memberships membership
    where membership.artist_id = v_artist_id
      and membership.role = 'owner'
      and membership.clerk_user_id <> p_clerk_user_id
  ) then
    raise exception 'This artist profile has already been claimed';
  end if;

  select membership.role
    into v_existing_role
  from public.artist_memberships membership
  where membership.artist_id = v_artist_id
    and membership.clerk_user_id = p_clerk_user_id;

  if v_existing_role is null then
    insert into public.artist_memberships (
      artist_id,
      clerk_user_id,
      role
    ) values (
      v_artist_id,
      p_clerk_user_id,
      'owner'
    );
  elsif v_existing_role <> 'owner' then
    update public.artist_memberships
    set role = 'owner'
    where artist_id = v_artist_id
      and clerk_user_id = p_clerk_user_id;
  end if;

  update public.artist_claim_invitations
  set
    status = 'claimed',
    claimed_by_clerk_user_id = p_clerk_user_id,
    claimed_at = now(),
    revoked_at = null
  where id = p_invitation_id
    and status = 'pending';

  return v_artist_id;
end;
$$;

revoke all on function public.claim_artist_invitation(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_artist_invitation(uuid, text, text) to service_role;
