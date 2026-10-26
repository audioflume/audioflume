create table if not exists public.song_similar_references (
  song_id uuid not null references public.songs(id) on delete cascade,
  deezer_track_id text not null,
  title text not null,
  artist text not null,
  image_url text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  primary key (song_id, deezer_track_id)
);

create index if not exists song_similar_references_song_position
  on public.song_similar_references (song_id, position);

alter table public.song_similar_references enable row level security;
revoke all on public.song_similar_references from anon, authenticated;
-- All access goes through server routes with Clerk/artist authorization and a service-role client.
