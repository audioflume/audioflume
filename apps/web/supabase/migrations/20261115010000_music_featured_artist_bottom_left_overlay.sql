alter table public.music_featured_artists
  add column if not exists overlay_opacity integer not null default 0
  check (overlay_opacity between 0 and 100);
