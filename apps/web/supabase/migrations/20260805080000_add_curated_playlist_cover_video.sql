alter table public.curated_playlists
  add column if not exists cover_video_url text;

notify pgrst, 'reload schema';
