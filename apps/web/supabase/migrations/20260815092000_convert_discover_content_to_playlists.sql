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
on conflict (shelf_key, curated_playlist_id) do nothing;

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
on conflict (shelf_key, curated_playlist_id) do nothing;

update public.curated_playlists
set discover_section = null
where discover_section in (
  'discover_block_1',
  'discover_block_2',
  'discover_block_3',
  'discover_block_4',
  'production_style_1',
  'production_style_2',
  'production_style_3',
  'production_style_4'
);
