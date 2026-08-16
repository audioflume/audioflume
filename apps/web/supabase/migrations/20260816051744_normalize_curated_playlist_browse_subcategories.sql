with mapped as (
  select
    playlist.id,
    case
      when item.value = 'editors:social-short-form' then 'film-story'
      when position(':' in item.value) > 0 then split_part(item.value, ':', 2)
      else item.value
    end as value,
    item.position
  from public.curated_playlists as playlist
  cross join lateral unnest(playlist.browse_subcategories) with ordinality as item(value, position)
), deduped as (
  select id, value, min(position) as first_position
  from mapped
  group by id, value
), normalized as (
  select id, array_agg(value order by first_position) as browse_subcategories
  from deduped
  group by id
)
update public.curated_playlists as playlist
set browse_subcategories = normalized.browse_subcategories
from normalized
where playlist.id = normalized.id
  and playlist.browse_subcategories is distinct from normalized.browse_subcategories;
