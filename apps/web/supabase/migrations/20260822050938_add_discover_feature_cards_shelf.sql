alter table public.curated_playlist_shelf_items
  drop constraint if exists curated_playlist_shelf_items_shelf_key_check;

alter table public.curated_playlist_shelf_items
  add constraint curated_playlist_shelf_items_shelf_key_check
  check (
    shelf_key = any (
      array[
        'popular'::text,
        'trending'::text,
        'discover_feature_cards'::text,
        'discover_moods'::text,
        'discover_curated'::text,
        'discover_production'::text
      ]
    )
  );
