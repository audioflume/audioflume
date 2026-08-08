-- Multi-select browse subcategories used to build shelves after a Curated filter is selected.
alter table public.curated_playlists
  add column if not exists browse_subcategories text[] not null default '{}'::text[];
