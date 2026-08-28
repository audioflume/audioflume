create table if not exists public.artist_application_samples (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  file_name text not null,
  audio_url text not null,
  position integer not null default 0,
  size_bytes bigint,
  created_at timestamptz not null default now(),

  constraint artist_application_samples_file_name_check
    check (length(btrim(file_name)) > 0),
  constraint artist_application_samples_position_check
    check (position >= 0 and position < 4),
  constraint artist_application_samples_size_check
    check (size_bytes is null or size_bytes >= 0),
  constraint artist_application_samples_artist_position_unique
    unique (artist_id, position)
);

create index if not exists artist_application_samples_artist_idx
  on public.artist_application_samples (artist_id, position);

alter table public.artist_application_samples enable row level security;

grant select, insert, update, delete on table public.artist_application_samples to service_role;
