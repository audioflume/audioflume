-- Filmwave account center setup
-- Run this in the Supabase SQL editor before using the account routes.

create table if not exists user_profiles (
  clerk_user_id text primary key,

  first_name text,
  last_name text,
  display_name text,
  company_name text,
  primary_use text,
  avatar_url text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_profiles_display_name_idx
on user_profiles (display_name);

create table if not exists user_billing_profiles (
  clerk_user_id text primary key references user_profiles(clerk_user_id) on delete cascade,

  billing_email text,
  business_name text,
  tax_id text,
  country text,
  province_state text,

  stripe_customer_id text unique,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists user_memberships (
  clerk_user_id text primary key references user_profiles(clerk_user_id) on delete cascade,

  plan_key text not null default 'free',
  status text not null default 'inactive',

  stripe_subscription_id text unique,
  stripe_price_id text,

  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,

  license_label text not null default 'Standard royalty-free license',
  download_limit integer,
  downloads_used integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint user_memberships_status_check
    check (status in ('inactive', 'active', 'trialing', 'past_due', 'canceled', 'lifetime')),

  constraint user_memberships_plan_key_check
    check (plan_key in ('free', 'starter', 'studio', 'enterprise', 'lifetime'))
);

create table if not exists user_downloads (
  id bigserial primary key,
  clerk_user_id text not null references user_profiles(clerk_user_id) on delete cascade,

  song_id text not null,
  download_type text not null default 'full_track',

  created_at timestamptz not null default now(),

  constraint user_downloads_download_type_check
    check (download_type in ('full_track', 'stem', 'preview', 'license'))
);

create index if not exists user_downloads_user_idx
on user_downloads (clerk_user_id, created_at desc);

create index if not exists user_downloads_song_idx
on user_downloads (song_id);

create table if not exists user_security_events (
  id bigserial primary key,
  clerk_user_id text not null references user_profiles(clerk_user_id) on delete cascade,

  event_type text not null,
  description text,
  location_label text,

  created_at timestamptz not null default now()
);

create index if not exists user_security_events_user_idx
on user_security_events (clerk_user_id, created_at desc);

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_user_profiles_updated_at on user_profiles;
create trigger set_user_profiles_updated_at
before update on user_profiles
for each row execute function set_updated_at();

drop trigger if exists set_user_billing_profiles_updated_at on user_billing_profiles;
create trigger set_user_billing_profiles_updated_at
before update on user_billing_profiles
for each row execute function set_updated_at();

drop trigger if exists set_user_memberships_updated_at on user_memberships;
create trigger set_user_memberships_updated_at
before update on user_memberships
for each row execute function set_updated_at();

-- The app currently uses a server-side Supabase service role client for these routes.
-- If you later move account reads/writes to the browser, enable RLS and add user-scoped policies.
