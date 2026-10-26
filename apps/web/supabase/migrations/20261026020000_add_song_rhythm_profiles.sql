create table if not exists private.song_rhythm_profiles (
  song_id uuid primary key references public.songs(id) on delete cascade,
  onset_density double precision not null,
  rhythmic_activity double precision not null,
  beat_pattern jsonb not null,
  estimated_bpm double precision,
  version text not null,
  source_url text not null,
  updated_at timestamp with time zone not null default now()
);

revoke all on table private.song_rhythm_profiles from public, anon, authenticated;
grant select, insert, update, delete on table private.song_rhythm_profiles to service_role;

create index if not exists song_rhythm_profiles_version_idx
  on private.song_rhythm_profiles (version);

create or replace function public.list_song_rhythm_profile_candidates(
  p_limit integer default 1,
  p_version text default 'rhythm-profile:5x10s:v1'
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
  left join private.song_rhythm_profiles r
    on r.song_id = published.id
  where published.source_url is not null
    and (
      r.song_id is null
      or r.version <> p_version
      or r.source_url is distinct from published.source_url
    )
  order by published.created_at asc
  limit least(greatest(coalesce(p_limit, 1), 1), 2);
$function$;

create or replace function public.get_song_rhythm_profile_candidate(
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

create or replace function public.upsert_song_rhythm_profile(
  p_song_id uuid,
  p_onset_density double precision,
  p_rhythmic_activity double precision,
  p_beat_pattern jsonb,
  p_estimated_bpm double precision,
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
    raise exception 'Rhythm profile version is required';
  end if;

  if p_source_url is null or btrim(p_source_url) = '' then
    raise exception 'Audio source URL is required';
  end if;

  if jsonb_typeof(coalesce(p_beat_pattern, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_beat_pattern, '[]'::jsonb)) = 0 then
    raise exception 'Beat pattern is required';
  end if;

  if not exists (
    select 1
    from public.songs
    where id = p_song_id
      and status = 'published'
  ) then
    delete from private.song_rhythm_profiles
    where song_id = p_song_id;
    return;
  end if;

  insert into private.song_rhythm_profiles (
    song_id,
    onset_density,
    rhythmic_activity,
    beat_pattern,
    estimated_bpm,
    version,
    source_url,
    updated_at
  )
  values (
    p_song_id,
    p_onset_density,
    p_rhythmic_activity,
    p_beat_pattern,
    p_estimated_bpm,
    p_version,
    p_source_url,
    now()
  )
  on conflict (song_id) do update
    set onset_density = excluded.onset_density,
        rhythmic_activity = excluded.rhythmic_activity,
        beat_pattern = excluded.beat_pattern,
        estimated_bpm = excluded.estimated_bpm,
        version = excluded.version,
        source_url = excluded.source_url,
        updated_at = excluded.updated_at;
end;
$function$;

create or replace function public.get_song_rhythm_profiles_by_ids(
  p_song_ids uuid[],
  p_version text default 'rhythm-profile:5x10s:v1'
)
returns table (
  song_id uuid,
  onset_density double precision,
  rhythmic_activity double precision,
  beat_pattern jsonb,
  estimated_bpm double precision
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    r.song_id,
    r.onset_density,
    r.rhythmic_activity,
    r.beat_pattern,
    r.estimated_bpm
  from private.song_rhythm_profiles r
  inner join public.songs s
    on s.id = r.song_id
  where s.status = 'published'
    and r.song_id = any(p_song_ids)
    and r.version = p_version;
$function$;

create or replace function public.get_song_rhythm_profile_stats(
  p_version text default 'rhythm-profile:5x10s:v1'
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
    count(r.song_id) filter (
      where r.version = p_version
        and r.source_url is not distinct from published.source_url
    )::bigint as profiled_songs,
    count(*) filter (
      where r.song_id is null
        or r.version <> p_version
        or r.source_url is distinct from published.source_url
    )::bigint as pending_songs
  from published
  left join private.song_rhythm_profiles r
    on r.song_id = published.id;
$function$;

revoke execute on function public.list_song_rhythm_profile_candidates(integer, text) from public, anon, authenticated;
revoke execute on function public.get_song_rhythm_profile_candidate(uuid) from public, anon, authenticated;
revoke execute on function public.upsert_song_rhythm_profile(uuid, double precision, double precision, jsonb, double precision, text, text) from public, anon, authenticated;
revoke execute on function public.get_song_rhythm_profiles_by_ids(uuid[], text) from public, anon, authenticated;
revoke execute on function public.get_song_rhythm_profile_stats(text) from public, anon, authenticated;

grant execute on function public.list_song_rhythm_profile_candidates(integer, text) to service_role;
grant execute on function public.get_song_rhythm_profile_candidate(uuid) to service_role;
grant execute on function public.upsert_song_rhythm_profile(uuid, double precision, double precision, jsonb, double precision, text, text) to service_role;
grant execute on function public.get_song_rhythm_profiles_by_ids(uuid[], text) to service_role;
grant execute on function public.get_song_rhythm_profile_stats(text) to service_role;

notify pgrst, 'reload schema';
