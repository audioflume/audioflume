alter table public.projects
  add column if not exists is_archived boolean not null default false;

create index if not exists projects_clerk_user_archived_idx
  on public.projects (clerk_user_id, is_archived);
