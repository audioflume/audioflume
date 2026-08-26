alter table public.playlists
  add column if not exists source_type text not null default 'user';

alter table public.playlists
  drop constraint if exists playlists_source_type_check;

alter table public.playlists
  add constraint playlists_source_type_check
  check (source_type in ('user', 'curated', 'community'));
