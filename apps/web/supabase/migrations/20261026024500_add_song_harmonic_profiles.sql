create table if not exists private.song_harmonic_profiles (
  song_id uuid primary key references public.songs(id) on delete cascade,
  chroma jsonb not null,
  major_character double precision not null,
  harmonic_movement double precision not null,
  tonal_stability double precision not null,
  version text not null,
  source_url text not null,
  updated_at timestamp with time zone not null default now()
);

revoke all on table private.song_harmonic_profiles from public, anon, authenticated;
grant select, insert, update, delete on table private.song_harmonic_profiles to service_role;

create index if not exists song_harmonic_profiles_version_idx
  on private.song_harmonic_profiles (version);

create or replace function public.list_song_harmonic_profile_candidates(
  p_limit integer default 1,
  p_version text default 'harmonic-profile:5x10s:v1'
)
returns table (
  song_id uuid,
  source_url text
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with published as (
    select
      s.id,
      coalesce(
        nullif(btrim(s.playback_url), ''),
        nullif(btrim(s.audio_url), '')
      ) as source_url,
      s.created_at
    from public.songs s
    where s.status = 'published'
  )
  select
    published.id as song_id,
    published.source_url
  from published
  left join private.song_harmonic_profiles h
    on h.song_id = published.id
  where published.source_url is not null
    and (
      h.song_id is null
      or h.version <> p_version
      or h.source_url is distinct from published.source_url
    )
  order by published.created_at asc
  limit least(greatest(coalesce(p_limit, 1), 1), 2);
$function$;

create or replace function public.get_song_harmonic_profile_candidate(
  p_song_id uuid
)
returns table (
  song_id uuid,
  source_url text
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    s.id as song_id,
    coalesce(
      nullif(btrim(s.playback_url), ''),
      nullif(btrim(s.audio_url), '')
    ) as source_url
  from public.songs s
  where s.id = p_song_id
    and s.status = 'published'
    and coalesce(
      nullif(btrim(s.playback_url), ''),
      nullif(btrim(s.audio_url), '')
    ) is not null
  limit 1;
$function$;

create or replace function public.upsert_song_harmonic_profile(
  p_song_id uuid,
  p_chroma jsonb,
  p_major_character double precision,
  p_harmonic_movement double precision,
  p_tonal_stability double precision,
  p_version text,
  p_source_url text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if p_version is null or btrim(p_version) = '' then
    raise exception 'Harmonic profile version is required';
  end if;

  if p_source_url is null or btrim(p_source_url) = '' then
    raise exception 'Audio source URL is required';
  end if;

  if jsonb_typeof(coalesce(p_chroma, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_chroma, '[]'::jsonb)) <> 12 then
    raise exception 'Chroma profile must contain 12 values';
  end if;

  if not exists (
    select 1
    from public.songs
    where id = p_song_id
      and status = 'published'
  ) then
    delete from private.song_harmonic_profiles
    where song_id = p_song_id;
    return;
  end if;

  insert into private.song_harmonic_profiles (
    song_id,
    chroma,
    major_character,
    harmonic_movement,
    tonal_stability,
    version,
    source_url,
    updated_at
  )
  values (
    p_song_id,
    p_chroma,
    p_major_character,
    p_harmonic_movement,
    p_tonal_stability,
    p_version,
    p_source_url,
    now()
  )
  on conflict (song_id) do update
    set chroma = excluded.chroma,
        major_character = excluded.major_character,
        harmonic_movement = excluded.harmonic_movement,
        tonal_stability = excluded.tonal_stability,
        version = excluded.version,
        source_url = excluded.source_url,
        updated_at = excluded.updated_at;
end;
$function$;

create or replace function public.get_song_harmonic_profiles_by_ids(
  p_song_ids uuid[],
  p_version text default 'harmonic-profile:5x10s:v1'
)
returns table (
  song_id uuid,
  chroma jsonb,
  major_character double precision,
  harmonic_movement double precision,
  tonal_stability double precision
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    h.song_id,
    h.chroma,
    h.major_character,
    h.harmonic_movement,
    h.tonal_stability
  from private.song_harmonic_profiles h
  inner join public.songs s
    on s.id = h.song_id
  where s.status = 'published'
    and h.song_id = any(p_song_ids)
    and h.version = p_version;
$function$;

create or replace function public.get_song_harmonic_profile_stats(
  p_version text default 'harmonic-profile:5x10s:v1'
)
returns table (
  published_songs bigint,
  profiled_songs bigint,
  pending_songs bigint
)
language sql
stable
security invoker
set search_path = ''
as $function$
  with published as (
    select
      s.id,
      coalesce(
        nullif(btrim(s.playback_url), ''),
        nullif(btrim(s.audio_url), '')
      ) as source_url
    from public.songs s
    where s.status = 'published'
      and coalesce(
        nullif(btrim(s.playback_url), ''),
        nullif(btrim(s.audio_url), '')
      ) is not null
  )
  select
    count(*)::bigint as published_songs,
    count(h.song_id) filter (
      where h.version = p_version
        and h.source_url is not distinct from published.source_url
    )::bigint as profiled_songs,
    count(*) filter (
      where h.song_id is null
        or h.version <> p_version
        or h.source_url is distinct from published.source_url
    )::bigint as pending_songs
  from published
  left join private.song_harmonic_profiles h
    on h.song_id = published.id;
$function$;

revoke execute on function public.list_song_harmonic_profile_candidates(integer, text) from public, anon, authenticated;
revoke execute on function public.get_song_harmonic_profile_candidate(uuid) from public, anon, authenticated;
revoke execute on function public.upsert_song_harmonic_profile(uuid, jsonb, double precision, double precision, double precision, text, text) from public, anon, authenticated;
revoke execute on function public.get_song_harmonic_profiles_by_ids(uuid[], text) from public, anon, authenticated;
revoke execute on function public.get_song_harmonic_profile_stats(text) from public, anon, authenticated;

grant execute on function public.list_song_harmonic_profile_candidates(integer, text) to service_role;
grant execute on function public.get_song_harmonic_profile_candidate(uuid) to service_role;
grant execute on function public.upsert_song_harmonic_profile(uuid, jsonb, double precision, double precision, double precision, text, text) to service_role;
grant execute on function public.get_song_harmonic_profiles_by_ids(uuid[], text) to service_role;
grant execute on function public.get_song_harmonic_profile_stats(text) to service_role;

notify pgrst, 'reload schema';
