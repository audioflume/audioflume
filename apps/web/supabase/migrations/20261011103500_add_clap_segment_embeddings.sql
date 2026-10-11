alter table private.song_clap_embeddings
  add column if not exists segment_embeddings jsonb not null default '[]'::jsonb;

drop function if exists public.upsert_song_clap_embedding(
  uuid,
  extensions.vector,
  jsonb,
  text,
  integer,
  text
);

create function public.upsert_song_clap_embedding(
  p_song_id uuid,
  p_embedding extensions.vector(512),
  p_segment_embeddings jsonb,
  p_concept_profile jsonb,
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

  if jsonb_typeof(coalesce(p_segment_embeddings, '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_segment_embeddings, '[]'::jsonb)) = 0 then
    raise exception 'CLAP segment embeddings are required';
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
    segment_embeddings,
    concept_profile,
    model,
    dimensions,
    source_url,
    updated_at
  )
  values (
    p_song_id,
    p_embedding,
    p_segment_embeddings,
    coalesce(p_concept_profile, '{}'::jsonb),
    p_model,
    p_dimensions,
    p_source_url,
    now()
  )
  on conflict (song_id) do update
    set embedding = excluded.embedding,
        segment_embeddings = excluded.segment_embeddings,
        concept_profile = excluded.concept_profile,
        model = excluded.model,
        dimensions = excluded.dimensions,
        source_url = excluded.source_url,
        updated_at = excluded.updated_at;
end;
$function$;

drop function if exists public.match_song_clap_embeddings(
  extensions.vector,
  integer,
  double precision,
  text,
  integer
);

create function public.match_song_clap_embeddings(
  query_embedding extensions.vector(512),
  match_count integer default 200,
  min_similarity double precision default -1,
  p_model text default 'Xenova/larger_clap_music_and_speech:q8:3x10s:segments-v3',
  p_dimensions integer default 512
)
returns table (
  song_id uuid,
  similarity double precision,
  segment_embeddings jsonb,
  concept_profile jsonb
)
language sql
stable
security invoker
set search_path = ''
as $function$
  select
    e.song_id,
    1 - (e.embedding OPERATOR(extensions.<=>) query_embedding) as similarity,
    e.segment_embeddings,
    e.concept_profile
  from private.song_clap_embeddings e
  inner join public.songs s
    on s.id = e.song_id
  where s.status = 'published'
    and e.model = p_model
    and e.dimensions = p_dimensions
    and jsonb_typeof(e.segment_embeddings) = 'array'
    and jsonb_array_length(e.segment_embeddings) > 0
    and 1 - (e.embedding OPERATOR(extensions.<=>) query_embedding) >= coalesce(min_similarity, -1)
  order by e.embedding OPERATOR(extensions.<=>) query_embedding asc
  limit least(greatest(coalesce(match_count, 200), 1), 200);
$function$;

revoke execute on function public.upsert_song_clap_embedding(uuid, extensions.vector, jsonb, jsonb, text, integer, text) from public, anon, authenticated;
revoke execute on function public.match_song_clap_embeddings(extensions.vector, integer, double precision, text, integer) from public, anon, authenticated;

grant execute on function public.upsert_song_clap_embedding(uuid, extensions.vector, jsonb, jsonb, text, integer, text) to service_role;
grant execute on function public.match_song_clap_embeddings(extensions.vector, integer, double precision, text, integer) to service_role;

notify pgrst, 'reload schema';
