-- Dedicated featured-banner selection for the Curated Playlists landing page.
alter table public.curated_playlists
  add column if not exists show_on_curated_feature boolean not null default false;

-- Preserve the previous landing-page behavior on first deploy by marking the
-- four newest regular curated playlists as featured. Admins can then change
-- the selection explicitly from the playlist create/edit form.
with current_featured as (
  select id
  from public.curated_playlists
  where discover_section is null
  order by created_at desc, id desc
  limit 4
)
update public.curated_playlists
set show_on_curated_feature = true
where id in (select id from current_featured);

create index if not exists curated_playlists_curated_feature_idx
  on public.curated_playlists (show_on_curated_feature, created_at desc)
  where show_on_curated_feature = true;
