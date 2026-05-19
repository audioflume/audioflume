alter table public.song_edit_points
add column if not exists kind text not null default 'point',
add column if not exists start_time_seconds numeric,
add column if not exists end_time_seconds numeric;

alter table public.song_edit_points
drop constraint if exists song_edit_points_kind_check;

alter table public.song_edit_points
add constraint song_edit_points_kind_check
check (kind in ('point', 'range'));

update public.song_edit_points
set kind = 'point'
where kind is null;

create index if not exists song_edit_points_song_id_kind_idx
on public.song_edit_points(song_id, kind);
