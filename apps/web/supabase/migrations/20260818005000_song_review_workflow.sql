alter table public.songs
  drop constraint if exists songs_status_check;

alter table public.songs
  add constraint songs_status_check
  check (status in ('draft', 'processing', 'submitted', 'changes_requested', 'rejected', 'approved', 'published'));

create table if not exists public.song_review_events (
  id uuid primary key default gen_random_uuid(),
  song_id uuid not null references public.songs(id) on delete cascade,
  action text not null,
  notes text,
  reviewed_by_clerk_user_id text,
  created_at timestamptz not null default now(),

  constraint song_review_events_action_check
    check (action in ('changes_requested', 'rejected', 'approved', 'published')),
  constraint song_review_events_notes_length_check
    check (notes is null or char_length(notes) <= 4000)
);

create index if not exists song_review_events_song_created_idx
  on public.song_review_events (song_id, created_at desc);

alter table public.song_review_events enable row level security;

grant select, insert, update, delete on table public.song_review_events to service_role;
