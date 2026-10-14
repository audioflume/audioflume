-- Managed Curated feature carousel shelf and dedicated feature artwork.
alter table public.curated_playlists
  add column if not exists feature_cover_image_url text;

alter table public.curated_playlist_shelf_items
  drop constraint if exists curated_playlist_shelf_items_shelf_key_check;

alter table public.curated_playlist_shelf_items
  add constraint curated_playlist_shelf_items_shelf_key_check
  check (
    shelf_key = any (
      array[
        'featured'::text,
        'popular'::text,
        'trending'::text,
        'discover_moods'::text,
        'discover_curated'::text,
        'discover_production'::text
      ]
    )
  );

-- Seed the managed feature shelf from the legacy featured flag so existing
-- selections remain available after this migration.
insert into public.curated_playlist_shelf_items (
  shelf_key,
  curated_playlist_id,
  position
)
select
  'featured',
  id,
  row_number() over (order by position asc, created_at desc, id desc) - 1
from public.curated_playlists
where show_on_curated_feature = true
on conflict (shelf_key, curated_playlist_id) do nothing;
