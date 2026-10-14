-- Track community playlist plays against the song that actually started playback.
-- Counts can then exclude songs that are no longer in the published library.

create table if not exists public.community_playlist_play_events (
  id bigint generated always as identity primary key,
  playlist_id bigint not null references public.playlists(id) on delete cascade,
  song_id uuid not null references public.songs(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists community_playlist_play_events_playlist_id_idx
  on public.community_playlist_play_events (playlist_id);

create index if not exists community_playlist_play_events_song_id_idx
  on public.community_playlist_play_events (song_id);

alter table public.community_playlist_play_events enable row level security;
