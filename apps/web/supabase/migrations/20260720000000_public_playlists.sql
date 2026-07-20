-- Public playlist sharing for the Community Playlists page.
alter table public.playlists
  add column if not exists is_public boolean not null default false,
  add column if not exists published_at timestamptz;

create index if not exists playlists_public_published_at_idx
  on public.playlists (published_at desc)
  where is_public = true;
