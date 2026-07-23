-- Per-user favorites for public community playlists.
create table if not exists public.community_playlist_favorites (
  clerk_user_id text not null,
  playlist_id bigint not null references public.playlists(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (clerk_user_id, playlist_id)
);

create index if not exists community_playlist_favorites_playlist_idx
  on public.community_playlist_favorites (playlist_id);

create index if not exists community_playlist_favorites_user_created_idx
  on public.community_playlist_favorites (clerk_user_id, created_at desc);

alter table public.community_playlist_favorites enable row level security;
