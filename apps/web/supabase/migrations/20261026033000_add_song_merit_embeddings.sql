create table if not exists private.song_merit_embeddings (
  song_id uuid primary key references public.songs(id) on delete cascade,
  melody_embedding vector(128) not null,
  rhythm_embedding vector(128) not null,
  timbre_embedding vector(128) not null,
  model text not null,
  dimensions integer not null,
  source_url text not null,
  updated_at timestamp with time zone not null default now()
);

revoke all on table private.song_merit_embeddings from public, anon, authenticated;
grant select, insert, update, delete on table private.song_merit_embeddings to service_role;

create index if not exists song_merit_embeddings_model_idx
  on private.song_merit_embeddings (model);

create or replace function public.list_song_merit_embedding_candidates(
  p_limit integer default 1,
  p_model text default 'amaai-lab/merit:mert-v1-330m:3x10s:v1',
  p_dimensions integer default 128
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
  left join private.song_merit_embeddings m
    on m.song_id = published.id
  where published.source_url is not null
    and (
      m.song_id is null
      or m.model <> p_model
      or m.dimensions <> p_dimensions
      or m.source_url is distinct from published.source_url
    )
  order by published.created_at asc
  limit least(greatest(coalesce(p_limit, 1), 1), 1);
$function$;

create or replace function public.get_song_merit_embedding_candidate(
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

create or replace function public.upsert_song_merit_embeddings(
  p_song_id uuid,
  p_melody_embedding vector(128),
  p_rhythm_embedding vector(128),
  p_timbre_embedding vector(128),
  p_model text,
  p_dimensions integer,
  p_source_url text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if p_model is null or btrim(p_model) = '' then
    raise exception 'MERIT model is required';
  end if;

  if p_dimensions <> 128 then
    raise exception 'MERIT embedding dimensions must be 128';
  end if;

  if p_source_url is null or btrim(p_source_url) = '' then
    raise exception 'Audio source URL is required';
  end if;

  if not exists (
    select 1
    from public.songs
    where id = p_song_id
      and status = 'published'
  ) then
    delete from private.song_merit_embeddings
    where song_id = p_song_id;
    return;
  end if;

  insert into private.song_merit_embeddings (
    song_id,
    melody_embedding,
    rhythm_embedding,
    timbre_embedding,
    model,
    dimensions,
    source_url,
    updated_at
  )
  values (
    p_song_id,
    p_melody_embedding,
    p_rhythm_embedding,
    p_timbre_embedding,
    p_model,
    p_dimensions,
    p_source_url,
    now()
  )
  on conflict (song_id) do update
    set melody_embedding = excluded.melody_embedding,
        rhythm_embedding = excluded.rhythm_embedding,
        timbre_embedding = excluded.timbre_embedding,
        model = excluded.model,
        dimensions = excluded.dimensions,
        source_url = excluded.source_url,
        updated_at = excluded.updated_at;
end;
$function$;

create or replace function public.get_song_merit_embeddings_by_ids(
  p_song_ids uuid[],
  p_model text default 'amaai-lab/merit:mert-v1-330m:3x10s:v1',
  p_dimensions integer default 128
)
returns table (
  song_id uuid,
  melody_embedding vector(128),
  rhythm_embedding vector(128),
  timbre_embedding vector(128)
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    m.song_id,
    m.melody_embedding,
    m.rhythm_embedding,
    m.timbre_embedding
  from private.song_merit_embeddings m
  inner join public.songs s
    on s.id = m.song_id
  where s.status = 'published'
    and m.song_id = any(p_song_ids)
    and m.model = p_model
    and m.dimensions = p_dimensions;
$function$;

create or replace function public.get_song_merit_embedding_stats(
  p_model text default 'amaai-lab/merit:mert-v1-330m:3x10s:v1',
  p_dimensions integer default 128
)
returns table (
  published_songs bigint,
  embedded_songs bigint,
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
    count(m.song_id) filter (
      where m.model = p_model
        and m.dimensions = p_dimensions
        and m.source_url is not distinct from published.source_url
    )::bigint as embedded_songs,
    count(*) filter (
      where m.song_id is null
        or m.model <> p_model
        or m.dimensions <> p_dimensions
        or m.source_url is distinct from published.source_url
    )::bigint as pending_songs
  from published
  left join private.song_merit_embeddings m
    on m.song_id = published.id;
$function$;

revoke execute on function public.list_song_merit_embedding_candidates(integer, text, integer) from public, anon, authenticated;
revoke execute on function public.get_song_merit_embedding_candidate(uuid) from public, anon, authenticated;
revoke execute on function public.upsert_song_merit_embeddings(uuid, vector, vector, vector, text, integer, text) from public, anon, authenticated;
revoke execute on function public.get_song_merit_embeddings_by_ids(uuid[], text, integer) from public, anon, authenticated;
revoke execute on function public.get_song_merit_embedding_stats(text, integer) from public, anon, authenticated;

grant execute on function public.list_song_merit_embedding_candidates(integer, text, integer) to service_role;
grant execute on function public.get_song_merit_embedding_candidate(uuid) to service_role;
grant execute on function public.upsert_song_merit_embeddings(uuid, vector, vector, vector, text, integer, text) to service_role;
grant execute on function public.get_song_merit_embeddings_by_ids(uuid[], text, integer) to service_role;
grant execute on function public.get_song_merit_embedding_stats(text, integer) to service_role;

notify pgrst, 'reload schema';
