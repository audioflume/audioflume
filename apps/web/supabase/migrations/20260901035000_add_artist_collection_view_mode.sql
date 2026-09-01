alter table public.user_preferences
  add column if not exists artist_collection_view_mode text not null default 'grid'
  check (artist_collection_view_mode in ('grid', 'list'));
