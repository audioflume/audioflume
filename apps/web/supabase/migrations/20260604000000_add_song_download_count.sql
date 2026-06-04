alter table public.songs
  add column if not exists download_count integer not null default 0;

create index if not exists songs_download_count_idx
  on public.songs (download_count desc);
