-- Save a Curated playlist into a user's My Playlists library in one transaction.
create or replace function public.save_curated_playlist_to_user(
  p_clerk_user_id text,
  p_curated_playlist_id bigint
)
returns table (
  id bigint,
  clerk_user_id text,
  name text,
  cover_image_url text,
  position integer,
  is_public boolean,
  published_at timestamptz,
  primary_category text,
  secondary_categories text[],
  source_type text,
  source_playlist_id bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.curated_playlists%rowtype;
  v_saved public.playlists%rowtype;
  v_next_position integer;
begin
  select *
  into v_source
  from public.curated_playlists
  where curated_playlists.id = p_curated_playlist_id;

  if not found then
    raise exception 'Curated playlist not found';
  end if;

  select *
  into v_saved
  from public.playlists
  where playlists.clerk_user_id = p_clerk_user_id
    and playlists.source_type = 'curated'
    and playlists.source_playlist_id = p_curated_playlist_id
  order by playlists.id asc
  limit 1;

  if found then
    return query
    select
      v_saved.id,
      v_saved.clerk_user_id,
      v_saved.name,
      v_saved.cover_image_url,
      v_saved.position,
      v_saved.is_public,
      v_saved.published_at,
      v_saved.primary_category,
      v_saved.secondary_categories,
      v_saved.source_type,
      v_saved.source_playlist_id;
    return;
  end if;

  select coalesce(max(playlists.position) + 1, 0)
  into v_next_position
  from public.playlists
  where playlists.clerk_user_id = p_clerk_user_id;

  insert into public.playlists (
    clerk_user_id,
    name,
    cover_image_url,
    position,
    source_type,
    source_playlist_id
  )
  values (
    p_clerk_user_id,
    v_source.name,
    v_source.cover_image_url,
    v_next_position,
    'curated',
    p_curated_playlist_id
  )
  returning *
  into v_saved;

  insert into public.playlist_songs (
    playlist_id,
    song_id,
    position
  )
  select
    v_saved.id,
    curated_playlist_songs.song_id,
    curated_playlist_songs.position
  from public.curated_playlist_songs
  where curated_playlist_songs.curated_playlist_id = p_curated_playlist_id
  order by curated_playlist_songs.position asc;

  return query
  select
    v_saved.id,
    v_saved.clerk_user_id,
    v_saved.name,
    v_saved.cover_image_url,
    v_saved.position,
    v_saved.is_public,
    v_saved.published_at,
    v_saved.primary_category,
    v_saved.secondary_categories,
    v_saved.source_type,
    v_saved.source_playlist_id;
end;
$$;

revoke all on function public.save_curated_playlist_to_user(text, bigint)
  from public, anon, authenticated;

grant execute on function public.save_curated_playlist_to_user(text, bigint)
  to service_role;
