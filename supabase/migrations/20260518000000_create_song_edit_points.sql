create table if not exists public.song_edit_points (
  id uuid primary key default gen_random_uuid(),
  song_id text not null,
  type text not null,
  time_seconds numeric not null,
  label text,
  confidence numeric,
  source text not null default 'auto',
  created_at timestamp with time zone not null default now()
);

create index if not exists song_edit_points_song_id_idx
on public.song_edit_points(song_id);

create index if not exists song_edit_points_song_id_source_idx
on public.song_edit_points(song_id, source);
