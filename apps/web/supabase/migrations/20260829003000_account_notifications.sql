create table if not exists public.account_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_clerk_user_id text not null references public.user_profiles(clerk_user_id) on delete cascade,
  kind text not null,
  title text not null,
  message text,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now(),

  constraint account_notifications_kind_check
    check (length(btrim(kind)) > 0),
  constraint account_notifications_title_check
    check (length(btrim(title)) > 0)
);

create index if not exists account_notifications_recipient_idx
  on public.account_notifications (recipient_clerk_user_id, created_at desc);
create index if not exists account_notifications_unread_idx
  on public.account_notifications (recipient_clerk_user_id, created_at desc)
  where read_at is null;

alter table public.account_notifications enable row level security;

grant select, insert, update, delete on table public.account_notifications to service_role;
