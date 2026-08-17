-- Audioflume artist data foundation.
-- Keeps the existing songs.artist text field intact for backwards compatibility.

create table if not exists public.artists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  bio text,
  location text,
  website_url text,
  instagram_url text,
  spotify_url text,
  youtube_url text,
  profile_image_url text,
  hero_image_url text,
  status text not null default 'pending',
  created_by_clerk_user_id text references public.user_profiles(clerk_user_id) on delete set null,
  approved_at timestamptz,
  approved_by_clerk_user_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint artists_name_check
    check (length(btrim(name)) > 0),
  constraint artists_slug_check
    check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint artists_status_check
    check (status in ('pending', 'approved', 'rejected', 'suspended'))
);

create unique index if not exists artists_slug_lower_idx
  on public.artists (lower(slug));
create index if not exists artists_status_idx
  on public.artists (status);
create index if not exists artists_name_idx
  on public.artists (name);

create table if not exists public.artist_memberships (
  artist_id uuid not null references public.artists(id) on delete cascade,
  clerk_user_id text not null references public.user_profiles(clerk_user_id) on delete cascade,
  role text not null default 'owner',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  primary key (artist_id, clerk_user_id),
  constraint artist_memberships_role_check
    check (role in ('owner', 'manager', 'editor', 'viewer'))
);

create index if not exists artist_memberships_user_idx
  on public.artist_memberships (clerk_user_id);

create table if not exists public.song_artists (
  song_id uuid not null references public.songs(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  role text not null default 'primary',
  position integer not null default 0,
  created_at timestamptz not null default now(),

  primary key (song_id, artist_id),
  constraint song_artists_role_check
    check (role in ('primary', 'featured', 'collaborator')),
  constraint song_artists_position_check
    check (position >= 0)
);

create index if not exists song_artists_artist_idx
  on public.song_artists (artist_id, position);

create table if not exists public.artist_releases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  release_type text not null default 'single',
  cover_image_url text,
  release_date date,
  status text not null default 'draft',
  created_by_clerk_user_id text references public.user_profiles(clerk_user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint artist_releases_title_check
    check (length(btrim(title)) > 0),
  constraint artist_releases_type_check
    check (release_type in ('single', 'ep', 'album')),
  constraint artist_releases_status_check
    check (status in ('draft', 'submitted', 'changes_requested', 'approved', 'published', 'archived'))
);

create index if not exists artist_releases_status_idx
  on public.artist_releases (status);
create index if not exists artist_releases_date_idx
  on public.artist_releases (release_date desc nulls last);

create table if not exists public.artist_release_artists (
  release_id uuid not null references public.artist_releases(id) on delete cascade,
  artist_id uuid not null references public.artists(id) on delete cascade,
  role text not null default 'primary',
  position integer not null default 0,
  created_at timestamptz not null default now(),

  primary key (release_id, artist_id),
  constraint artist_release_artists_role_check
    check (role in ('primary', 'featured', 'collaborator')),
  constraint artist_release_artists_position_check
    check (position >= 0)
);

create index if not exists artist_release_artists_artist_idx
  on public.artist_release_artists (artist_id, position);

create table if not exists public.artist_release_songs (
  release_id uuid not null references public.artist_releases(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  disc_number integer not null default 1,
  track_number integer not null,
  created_at timestamptz not null default now(),

  primary key (release_id, song_id),
  constraint artist_release_songs_disc_check
    check (disc_number > 0),
  constraint artist_release_songs_track_check
    check (track_number > 0),
  constraint artist_release_songs_track_unique
    unique (release_id, disc_number, track_number)
);

create index if not exists artist_release_songs_song_idx
  on public.artist_release_songs (song_id);

create table if not exists public.artist_playlists (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  name text not null,
  description text,
  cover_image_url text,
  is_public boolean not null default false,
  position integer not null default 0,
  created_by_clerk_user_id text references public.user_profiles(clerk_user_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint artist_playlists_name_check
    check (length(btrim(name)) > 0),
  constraint artist_playlists_position_check
    check (position >= 0)
);

create index if not exists artist_playlists_artist_idx
  on public.artist_playlists (artist_id, position);

create table if not exists public.artist_playlist_songs (
  playlist_id uuid not null references public.artist_playlists(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),

  primary key (playlist_id, song_id),
  constraint artist_playlist_songs_position_check
    check (position >= 0)
);

create index if not exists artist_playlist_songs_song_idx
  on public.artist_playlist_songs (song_id);

create table if not exists public.song_credits (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  artist_id uuid references public.artists(id) on delete set null,
  credit_name text not null,
  credit_role text not null,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint song_credits_name_check
    check (length(btrim(credit_name)) > 0),
  constraint song_credits_role_check
    check (length(btrim(credit_role)) > 0),
  constraint song_credits_position_check
    check (position >= 0)
);

create index if not exists song_credits_song_idx
  on public.song_credits (song_id, position);
create index if not exists song_credits_artist_idx
  on public.song_credits (artist_id)
  where artist_id is not null;

create table if not exists public.song_rights (
  song_id uuid primary key references public.songs(id) on delete cascade,
  master_owner text,
  publishing_owner text,
  pro_affiliation text,
  isrc text,
  iswc text,
  copyright_year integer,
  rights_confirmed boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint song_rights_copyright_year_check
    check (copyright_year is null or copyright_year >= 1900)
);

create table if not exists public.song_rights_holders (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  artist_id uuid references public.artists(id) on delete set null,
  holder_name text not null,
  rights_type text not null,
  ownership_percent numeric(5, 2),
  pro_affiliation text,
  ipi_cae_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint song_rights_holders_name_check
    check (length(btrim(holder_name)) > 0),
  constraint song_rights_holders_type_check
    check (rights_type in ('master', 'publishing', 'both')),
  constraint song_rights_holders_percent_check
    check (ownership_percent is null or (ownership_percent >= 0 and ownership_percent <= 100))
);

create index if not exists song_rights_holders_song_idx
  on public.song_rights_holders (song_id);
create index if not exists song_rights_holders_artist_idx
  on public.song_rights_holders (artist_id)
  where artist_id is not null;

-- Reuse the account migration's shared updated_at trigger function.
drop trigger if exists set_artists_updated_at on public.artists;
create trigger set_artists_updated_at
before update on public.artists
for each row execute function public.set_updated_at();

drop trigger if exists set_artist_memberships_updated_at on public.artist_memberships;
create trigger set_artist_memberships_updated_at
before update on public.artist_memberships
for each row execute function public.set_updated_at();

drop trigger if exists set_artist_releases_updated_at on public.artist_releases;
create trigger set_artist_releases_updated_at
before update on public.artist_releases
for each row execute function public.set_updated_at();

drop trigger if exists set_artist_playlists_updated_at on public.artist_playlists;
create trigger set_artist_playlists_updated_at
before update on public.artist_playlists
for each row execute function public.set_updated_at();

drop trigger if exists set_song_credits_updated_at on public.song_credits;
create trigger set_song_credits_updated_at
before update on public.song_credits
for each row execute function public.set_updated_at();

drop trigger if exists set_song_rights_updated_at on public.song_rights;
create trigger set_song_rights_updated_at
before update on public.song_rights
for each row execute function public.set_updated_at();

drop trigger if exists set_song_rights_holders_updated_at on public.song_rights_holders;
create trigger set_song_rights_holders_updated_at
before update on public.song_rights_holders
for each row execute function public.set_updated_at();

alter table public.artists enable row level security;
alter table public.artist_memberships enable row level security;
alter table public.song_artists enable row level security;
alter table public.artist_releases enable row level security;
alter table public.artist_release_artists enable row level security;
alter table public.artist_release_songs enable row level security;
alter table public.artist_playlists enable row level security;
alter table public.artist_playlist_songs enable row level security;
alter table public.song_credits enable row level security;
alter table public.song_rights enable row level security;
alter table public.song_rights_holders enable row level security;

grant select, insert, update, delete on table public.artists to service_role;
grant select, insert, update, delete on table public.artist_memberships to service_role;
grant select, insert, update, delete on table public.song_artists to service_role;
grant select, insert, update, delete on table public.artist_releases to service_role;
grant select, insert, update, delete on table public.artist_release_artists to service_role;
grant select, insert, update, delete on table public.artist_release_songs to service_role;
grant select, insert, update, delete on table public.artist_playlists to service_role;
grant select, insert, update, delete on table public.artist_playlist_songs to service_role;
grant select, insert, update, delete on table public.song_credits to service_role;
grant select, insert, update, delete on table public.song_rights to service_role;
grant select, insert, update, delete on table public.song_rights_holders to service_role;
