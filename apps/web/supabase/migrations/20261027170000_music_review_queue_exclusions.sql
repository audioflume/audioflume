-- Track removal from the admin review queue without changing a published song.
create table if not exists public.music_review_queue_exclusions (
  song_id uuid primary key references public.songs(id) on delete cascade,
  removed_at timestamptz not null default now()
);
alter table public.music_review_queue_exclusions enable row level security;
