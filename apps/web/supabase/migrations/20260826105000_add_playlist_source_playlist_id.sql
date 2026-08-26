alter table public.playlists
  add column if not exists source_playlist_id bigint;

create index if not exists playlists_source_lookup_idx
  on public.playlists (clerk_user_id, source_type, source_playlist_id)
  where source_type in ('curated', 'community')
    and source_playlist_id is not null;
