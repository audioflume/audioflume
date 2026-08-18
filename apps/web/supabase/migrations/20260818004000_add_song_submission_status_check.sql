alter table public.songs
  drop constraint if exists songs_status_check;

alter table public.songs
  add constraint songs_status_check
  check (status in ('draft', 'processing', 'submitted', 'changes_requested', 'approved', 'published'));
