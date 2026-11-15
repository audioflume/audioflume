create table if not exists public.music_featured_artists (
  artist_id uuid primary key references public.artists(id) on delete cascade,
  position integer not null default 0 check (position between 0 and 3),
  focal_x numeric(5,2) not null default 50 check (focal_x between 0 and 100),
  focal_y numeric(5,2) not null default 50 check (focal_y between 0 and 100),
  created_at timestamptz not null default now()
);
create index if not exists music_featured_artists_position_idx on public.music_featured_artists (position);
alter table public.music_featured_artists enable row level security;
revoke all on public.music_featured_artists from anon, authenticated;
insert into public.music_featured_artists (artist_id, position, focal_x, focal_y)
select d.artist_id, row_number() over(order by d.position, d.artist_id) - 1,
  coalesce(a.hero_image_position_x, 50), coalesce(a.hero_image_position_y, 50)
from public.discover_featured_artists d
join public.artists a on a.id = d.artist_id
where a.status = 'approved' and a.hero_image_url is not null and btrim(a.hero_image_url) <> ''
order by d.position, d.artist_id limit 4
on conflict (artist_id) do nothing;
