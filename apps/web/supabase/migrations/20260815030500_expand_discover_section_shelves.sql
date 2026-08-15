alter table public.curated_playlist_shelf_items
  drop constraint if exists curated_playlist_shelf_items_shelf_key_check;

alter table public.curated_playlist_shelf_items
  add constraint curated_playlist_shelf_items_shelf_key_check
  check (
    shelf_key = any (
      array[
        'popular'::text,
        'trending'::text,
        'discover_moods'::text,
        'discover_curated'::text,
        'discover_production'::text
      ]
    )
  );

insert into public.curated_playlist_shelf_items (
  shelf_key,
  curated_playlist_id,
  position
)
select
  'discover_moods',
  id,
  case discover_section
    when 'discover_block_1' then 0
    when 'discover_block_2' then 1
    when 'discover_block_3' then 2
    when 'discover_block_4' then 3
    else 999
  end
from public.curated_playlists
where discover_section in (
  'discover_block_1',
  'discover_block_2',
  'discover_block_3',
  'discover_block_4'
)
on conflict (shelf_key, curated_playlist_id)
do update set position = excluded.position;

insert into public.curated_playlist_shelf_items (
  shelf_key,
  curated_playlist_id,
  position
)
select
  'discover_production',
  id,
  case discover_section
    when 'production_style_1' then 0
    when 'production_style_2' then 1
    when 'production_style_3' then 2
    when 'production_style_4' then 3
    else 999
  end
from public.curated_playlists
where discover_section in (
  'production_style_1',
  'production_style_2',
  'production_style_3',
  'production_style_4'
)
on conflict (shelf_key, curated_playlist_id)
do update set position = excluded.position;

insert into public.curated_playlist_shelf_items (
  shelf_key,
  curated_playlist_id,
  position
)
select
  'discover_curated',
  id,
  row_number() over (order by discover_position asc, id asc) - 1
from public.curated_playlists
where show_on_discover = true
  and discover_section is null
on conflict (shelf_key, curated_playlist_id)
do update set position = excluded.position;
