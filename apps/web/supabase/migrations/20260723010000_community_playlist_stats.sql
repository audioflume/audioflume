-- Public engagement metrics for community playlists.
alter table public.playlists
  add column if not exists play_count bigint not null default 0;

create index if not exists playlists_public_play_count_idx
  on public.playlists (play_count desc)
  where is_public = true;
