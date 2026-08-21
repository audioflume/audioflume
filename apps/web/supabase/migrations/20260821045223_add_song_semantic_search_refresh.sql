create or replace function public.get_song_search_embedding_candidate(
  p_song_id uuid
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
  where s.id = p_song_id
    and s.status = 'published'
  limit 1;
$function$;

create or replace function public.get_song_search_embedding_stats()
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
    select s.id, private.song_search_text(s) as search_text
    from public.songs s
    where s.status = 'published'
  )
  select
    count(*)::bigint as published_songs,
    count(e.song_id)::bigint as embedded_songs,
    count(*) filter (
      where e.song_id is null
        or e.model <> 'text-embedding-3-large'
        or e.dimensions <> 1536
        or e.search_text is distinct from published.search_text
    )::bigint as pending_songs
  from published
  left join private.song_search_embeddings e
    on e.song_id = published.id;
$function$;

revoke execute on function public.get_song_search_embedding_candidate(uuid) from public, anon, authenticated;
revoke execute on function public.get_song_search_embedding_stats() from public, anon, authenticated;

grant execute on function public.get_song_search_embedding_candidate(uuid) to service_role;
grant execute on function public.get_song_search_embedding_stats() to service_role;

notify pgrst, 'reload schema';
