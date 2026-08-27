alter table public.artist_claim_invitations
  add column if not exists ownership_transfer boolean not null default false;

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
  v_ownership_transfer boolean;
begin
  if length(btrim(coalesce(p_clerk_user_id, ''))) = 0 then
    raise exception 'User is required';
  end if;

  if length(btrim(coalesce(p_email, ''))) = 0 then
    raise exception 'Email is required';
  end if;

  select invitation.artist_id, invitation.ownership_transfer
    into v_artist_id, v_ownership_transfer
  from public.artist_claim_invitations invitation
  where invitation.id = p_invitation_id
    and invitation.status = 'pending'
    and invitation.expires_at > now()
    and lower(invitation.email) = lower(btrim(p_email))
  for update;

  if v_artist_id is null then
    raise exception 'Claim invitation is invalid or expired';
  end if;

  if not v_ownership_transfer and exists (
    select 1
    from public.artist_memberships membership
    where membership.artist_id = v_artist_id
      and membership.role = 'owner'
      and membership.clerk_user_id <> p_clerk_user_id
  ) then
    raise exception 'This artist profile has already been claimed';
  end if;

  if v_ownership_transfer then
    delete from public.artist_memberships
    where artist_id = v_artist_id
      and role = 'owner'
      and clerk_user_id <> p_clerk_user_id;
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
