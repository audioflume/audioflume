create table if not exists private.song_clap_embeddings (
  song_id uuid primary key references public.songs(id) on delete cascade,
  embedding extensions.vector(512) not null,
  model text not null,
  dimensions integer not null,
  source_url text not null,
  updated_at timestamp with time zone not null default now(),
  constraint song_clap_embeddings_dimensions_check check (dimensions = 512)
);

revoke all on table private.song_clap_embeddings from public, anon, authenticated;
grant select, insert, update, delete on table private.song_clap_embeddings to service_role;

create index if not exists song_clap_embeddings_hnsw_idx
  on private.song_clap_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

create index if not exists song_clap_embeddings_model_dimensions_idx
  on private.song_clap_embeddings (model, dimensions);

create or replace function public.list_song_clap_embedding_candidates(
  p_limit integer default 1,
  p_model text default 'Xenova/larger_clap_music_and_speech:q8:3x10s:v1',
  p_dimensions integer default 512
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
  left join private.song_clap_embeddings e
    on e.song_id = published.id
  where published.source_url is not null
    and (
      e.song_id is null
      or e.model <> p_model
      or e.dimensions <> p_dimensions
      or e.source_url is distinct from published.source_url
    )
  order by published.created_at asc
  limit least(greatest(coalesce(p_limit, 1), 1), 2);
$function$;

create or replace function public.get_song_clap_embedding_candidate(
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

create or replace function public.upsert_song_clap_embedding(
  p_song_id uuid,
  p_embedding extensions.vector(512),
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
  if p_dimensions <> 512 then
    raise exception 'Unsupported CLAP embedding dimensions';
  end if;

  if p_model is null or btrim(p_model) = '' then
    raise exception 'CLAP model identifier is required';
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
    delete from private.song_clap_embeddings
    where song_id = p_song_id;
    return;
  end if;

  insert into private.song_clap_embeddings (
    song_id,
    embedding,
    model,
    dimensions,
    source_url,
    updated_at
  )
  values (
    p_song_id,
    p_embedding,
    p_model,
    p_dimensions,
    p_source_url,
    now()
  )
  on conflict (song_id) do update
    set embedding = excluded.embedding,
        model = excluded.model,
        dimensions = excluded.dimensions,
        source_url = excluded.source_url,
        updated_at = excluded.updated_at;
end;
$function$;

create or replace function public.match_song_clap_embeddings(
  query_embedding extensions.vector(512),
  match_count integer default 200,
  min_similarity double precision default -1,
  p_model text default 'Xenova/larger_clap_music_and_speech:q8:3x10s:v1',
  p_dimensions integer default 512
)
returns table (
  song_id uuid,
  similarity double precision
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    e.song_id,
    1 - (e.embedding OPERATOR(extensions.<=>) query_embedding) as similarity
  from private.song_clap_embeddings e
  inner join public.songs s
    on s.id = e.song_id
  where s.status = 'published'
    and e.model = p_model
    and e.dimensions = p_dimensions
    and 1 - (e.embedding OPERATOR(extensions.<=>) query_embedding) >= coalesce(min_similarity, -1)
  order by e.embedding OPERATOR(extensions.<=>) query_embedding asc
  limit least(greatest(coalesce(match_count, 200), 1), 200);
$function$;

create or replace function public.get_song_clap_embedding_stats(
  p_model text default 'Xenova/larger_clap_music_and_speech:q8:3x10s:v1',
  p_dimensions integer default 512
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
    count(e.song_id) filter (
      where e.model = p_model
        and e.dimensions = p_dimensions
        and e.source_url is not distinct from published.source_url
    )::bigint as embedded_songs,
    count(*) filter (
      where e.song_id is null
        or e.model <> p_model
        or e.dimensions <> p_dimensions
        or e.source_url is distinct from published.source_url
    )::bigint as pending_songs
  from published
  left join private.song_clap_embeddings e
    on e.song_id = published.id;
$function$;

revoke execute on function public.list_song_clap_embedding_candidates(integer, text, integer) from public, anon, authenticated;
revoke execute on function public.get_song_clap_embedding_candidate(uuid) from public, anon, authenticated;
revoke execute on function public.upsert_song_clap_embedding(uuid, extensions.vector, text, integer, text) from public, anon, authenticated;
revoke execute on function public.match_song_clap_embeddings(extensions.vector, integer, double precision, text, integer) from public, anon, authenticated;
revoke execute on function public.get_song_clap_embedding_stats(text, integer) from public, anon, authenticated;

grant execute on function public.list_song_clap_embedding_candidates(integer, text, integer) to service_role;
grant execute on function public.get_song_clap_embedding_candidate(uuid) to service_role;
grant execute on function public.upsert_song_clap_embedding(uuid, extensions.vector, text, integer, text) to service_role;
grant execute on function public.match_song_clap_embeddings(extensions.vector, integer, double precision, text, integer) to service_role;
grant execute on function public.get_song_clap_embedding_stats(text, integer) to service_role;

notify pgrst, 'reload schema';
