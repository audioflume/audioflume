-- Performance indexes for user-owned tables.
-- Without these, every query filtered by clerk_user_id does a full table scan,
-- which causes 2–9 second response times as the table grows.

-- playlists
create index if not exists playlists_clerk_user_id_position_idx
  on public.playlists (clerk_user_id, position);

-- playlist_songs
create index if not exists playlist_songs_playlist_id_idx
  on public.playlist_songs (playlist_id);

create index if not exists playlist_songs_song_id_idx
  on public.playlist_songs (song_id);

-- favorites
create index if not exists favorites_clerk_user_id_idx
  on public.favorites (clerk_user_id);

create index if not exists favorites_song_id_idx
  on public.favorites (song_id);

-- projects
create index if not exists projects_clerk_user_id_idx
  on public.projects (clerk_user_id);

-- project_assets
create index if not exists project_assets_project_id_idx
  on public.project_assets (project_id);

create index if not exists project_assets_asset_id_idx
  on public.project_assets (asset_id);

-- project_folders
create index if not exists project_folders_project_id_idx
  on public.project_folders (project_id);
