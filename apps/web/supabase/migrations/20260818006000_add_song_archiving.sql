alter table public.songs
  add column if not exists archived_at timestamptz,
  add column if not exists archived_from_status text;

alter table public.songs
  drop constraint if exists songs_status_check;

alter table public.songs
  add constraint songs_status_check
  check (status in ('draft', 'processing', 'submitted', 'changes_requested', 'rejected', 'approved', 'published', 'archived'));

alter table public.songs
  drop constraint if exists songs_archived_from_status_check;

alter table public.songs
  add constraint songs_archived_from_status_check
  check (
    archived_from_status is null or
    archived_from_status in ('draft', 'processing', 'submitted', 'changes_requested', 'rejected', 'approved', 'published')
  );
