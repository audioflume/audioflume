create table if not exists public.artist_notifications (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  recipient_clerk_user_id text not null references public.user_profiles(clerk_user_id) on delete cascade,
  kind text not null,
  title text not null,
  message text,
  action_url text,
  read_at timestamptz,
  created_at timestamptz not null default now(),

  constraint artist_notifications_kind_check
    check (length(btrim(kind)) > 0),
  constraint artist_notifications_title_check
    check (length(btrim(title)) > 0)
);

create index if not exists artist_notifications_recipient_idx
  on public.artist_notifications (recipient_clerk_user_id, created_at desc);
create index if not exists artist_notifications_artist_recipient_idx
  on public.artist_notifications (artist_id, recipient_clerk_user_id, created_at desc);
create index if not exists artist_notifications_unread_idx
  on public.artist_notifications (artist_id, recipient_clerk_user_id, created_at desc)
  where read_at is null;

alter table public.artist_notifications enable row level security;

grant select, insert, update, delete on table public.artist_notifications to service_role;
