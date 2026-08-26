drop index if exists public.playlists_source_lookup_idx;

create unique index playlists_source_lookup_idx
  on public.playlists (clerk_user_id, source_type, source_playlist_id)
  where source_type in ('curated', 'community')
    and source_playlist_id is not null;
