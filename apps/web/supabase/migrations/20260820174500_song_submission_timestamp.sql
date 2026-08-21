alter table public.songs
  add column if not exists submitted_at timestamptz;

update public.songs
set submitted_at = created_at
where submitted_at is null
  and status in ('submitted', 'changes_requested', 'rejected', 'approved', 'published');

create index if not exists songs_submitted_at_idx
  on public.songs (submitted_at desc nulls last);
