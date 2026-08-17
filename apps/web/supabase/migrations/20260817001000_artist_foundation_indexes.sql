create index if not exists artists_created_by_user_idx
  on public.artists (created_by_clerk_user_id)
  where created_by_clerk_user_id is not null;

create index if not exists artist_releases_created_by_user_idx
  on public.artist_releases (created_by_clerk_user_id)
  where created_by_clerk_user_id is not null;

create index if not exists artist_playlists_created_by_user_idx
  on public.artist_playlists (created_by_clerk_user_id)
  where created_by_clerk_user_id is not null;
