-- Multi-select browse filters for the Curated Playlists landing page.
alter table public.curated_playlists
  add column if not exists browse_tags text[] not null default '{}'::text[];

-- Preserve the meaning of the existing Curated filter pills on first deploy so
-- current playlists are immediately filterable. Admins can refine these tags
-- from the playlist create/edit form afterward.
update public.curated_playlists
set browse_tags = case playlist_group
  when 'Editor Picks' then array['editors', 'cinematic']::text[]
  when 'Ambient' then array['mood']::text[]
  when 'Tension' then array['mood', 'dark-moody']::text[]
  when 'Commercial' then array['genre', 'brands']::text[]
  when 'Documentary' then array['genre', 'documentary', 'cinematic']::text[]
  when 'Travel' then array['travel']::text[]
  else browse_tags
end
where coalesce(array_length(browse_tags, 1), 0) = 0;
