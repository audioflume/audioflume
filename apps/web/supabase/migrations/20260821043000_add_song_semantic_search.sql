create extension if not exists vector with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to service_role;

create or replace function private.song_search_text(song public.songs)
returns text
language sql
immutable
security invoker
set search_path = ''
as $function$
  select concat_ws(
    E'\n',
    'Music track metadata for film and video licensing.',
    case
      when nullif(btrim((song).title), '') is not null
        then 'Title: ' || btrim((song).title)
    end,
    case
      when nullif(btrim((song).artist), '') is not null
        then 'Artist: ' || btrim((song).artist)
    end,
    case
      when coalesce(cardinality((song).genres), 0) > 0
        then 'Genres: ' || array_to_string((song).genres, ', ')
    end,
    case
      when coalesce(cardinality((song).moods), 0) > 0
        then 'Moods and scenes: ' || array_to_string((song).moods, ', ')
    end,
    case
      when coalesce(cardinality((song).regions), 0) > 0
        then 'Regions and styles: ' || array_to_string((song).regions, ', ')
    end,
    case
      when coalesce(cardinality((song).instruments), 0) > 0
        then 'Instruments: ' || array_to_string((song).instruments, ', ')
    end,
    case
      when coalesce(cardinality((song).builds), 0) > 0
        then 'Build and movement: ' || array_to_string((song).builds, ', ')
    end,
    case
      when coalesce(cardinality((song).vocals), 0) > 0
        then 'Vocals: ' || array_to_string((song).vocals, ', ')
    end,
    case
      when (song).instrumental is true then 'Instrumental: yes'
      when (song).instrumental is false then 'Instrumental: no'
    end,
    case
      when coalesce((song).bpm, 0) > 0
        then 'Tempo: ' || (song).bpm::text || ' BPM'
    end,
    case
      when nullif(btrim((song).key), '') is not null
        then 'Key: ' || btrim((song).key)
    end,
    case
      when coalesce((song).duration, 0) > 0
        then 'Duration: ' || round((song).duration::numeric, 1)::text || ' seconds'
    end
  );
$function$;

revoke execute on function private.song_search_text(public.songs) from public;
grant execute on function private.song_search_text(public.songs) to service_role;

create table if not exists private.song_search_embeddings (
  song_id uuid primary key references public.songs(id) on delete cascade,
  embedding extensions.vector(1536) not null,
  model text not null,
  dimensions integer not null,
  search_text text not null,
  updated_at timestamp with time zone not null default now(),
  constraint song_search_embeddings_dimensions_check check (dimensions = 1536)
);

revoke all on table private.song_search_embeddings from public, anon, authenticated;
grant select, insert, update, delete on table private.song_search_embeddings to service_role;

create index if not exists song_search_embeddings_embedding_hnsw_idx
  on private.song_search_embeddings
  using hnsw (embedding extensions.vector_cosine_ops);

create index if not exists song_search_embeddings_model_dimensions_idx
  on private.song_search_embeddings (model, dimensions);

create or replace function public.list_song_search_embedding_candidates(
  p_limit integer default 100
)
returns table (
  song_id uuid,
  search_text text
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    s.id as song_id,
    private.song_search_text(s) as search_text
  from public.songs s
  left join private.song_search_embeddings e
    on e.song_id = s.id
  where s.status = 'published'
    and (
      e.song_id is null
      or e.model <> 'text-embedding-3-large'
      or e.dimensions <> 1536
      or e.search_text is distinct from private.song_search_text(s)
    )
  order by s.created_at asc
  limit least(greatest(coalesce(p_limit, 100), 1), 200);
$function$;

create or replace function public.upsert_song_search_embedding(
  p_song_id uuid,
  p_embedding extensions.vector(1536),
  p_model text,
  p_dimensions integer,
  p_search_text text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  if p_model <> 'text-embedding-3-large' or p_dimensions <> 1536 then
    raise exception 'Unsupported song search embedding configuration';
  end if;

  if p_search_text is null or btrim(p_search_text) = '' then
    raise exception 'Song search text is required';
  end if;

  if not exists (
    select 1
    from public.songs
    where id = p_song_id
      and status = 'published'
  ) then
    delete from private.song_search_embeddings
    where song_id = p_song_id;
    return;
  end if;

  insert into private.song_search_embeddings (
    song_id,
    embedding,
    model,
    dimensions,
    search_text,
    updated_at
  )
  values (
    p_song_id,
    p_embedding,
    p_model,
    p_dimensions,
    p_search_text,
    now()
  )
  on conflict (song_id) do update
    set embedding = excluded.embedding,
        model = excluded.model,
        dimensions = excluded.dimensions,
        search_text = excluded.search_text,
        updated_at = excluded.updated_at;
end;
$function$;

create or replace function public.match_song_search_embeddings(
  query_embedding extensions.vector(1536),
  match_count integer default 100,
  min_similarity double precision default 0.30
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
  from private.song_search_embeddings e
  inner join public.songs s
    on s.id = e.song_id
  where s.status = 'published'
    and e.model = 'text-embedding-3-large'
    and e.dimensions = 1536
    and 1 - (e.embedding OPERATOR(extensions.<=>) query_embedding) >= coalesce(min_similarity, 0.30)
  order by e.embedding OPERATOR(extensions.<=>) query_embedding asc
  limit least(greatest(coalesce(match_count, 100), 1), 200);
$function$;

revoke execute on function public.list_song_search_embedding_candidates(integer) from public, anon, authenticated;
revoke execute on function public.upsert_song_search_embedding(uuid, extensions.vector, text, integer, text) from public, anon, authenticated;
revoke execute on function public.match_song_search_embeddings(extensions.vector, integer, double precision) from public, anon, authenticated;

grant execute on function public.list_song_search_embedding_candidates(integer) to service_role;
grant execute on function public.upsert_song_search_embedding(uuid, extensions.vector, text, integer, text) to service_role;
grant execute on function public.match_song_search_embeddings(extensions.vector, integer, double precision) to service_role;

notify pgrst, 'reload schema';
