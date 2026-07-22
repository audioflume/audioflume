-- Category metadata for public playlists.
alter table public.playlists
  add column if not exists primary_category text,
  add column if not exists secondary_categories text[] not null default '{}';

create index if not exists playlists_primary_category_idx
  on public.playlists (primary_category)
  where is_public = true;

create index if not exists playlists_secondary_categories_idx
  on public.playlists using gin (secondary_categories)
  where is_public = true;
