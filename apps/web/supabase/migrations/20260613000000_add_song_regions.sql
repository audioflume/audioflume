alter table public.songs
  add column if not exists regions text[] not null default '{}';

create index if not exists songs_regions_gin_idx
  on public.songs using gin (regions);
