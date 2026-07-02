create table if not exists public.song_shorten_jobs (
  id uuid primary key default gen_random_uuid(),
  song_id text not null,
  clerk_user_id text,

  target_seconds integer not null,
  status text not null default 'queued',
  mode text not null default 'smart_trim',
  provider text,

  source_url text,
  output_url text,
  output_key text,
  output_hls_url text,
  output_hls_key text,
  output_waveform_peaks jsonb,
  output_size_bytes bigint,
  output_duration_seconds numeric,

  error_message text,
  worker_job_id text,
  request_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,

  queued_at timestamp with time zone not null default now(),
  started_at timestamp with time zone,
  completed_at timestamp with time zone,
  failed_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),

  constraint song_shorten_jobs_target_seconds_check
    check (target_seconds in (15, 30, 60)),

  constraint song_shorten_jobs_status_check
    check (status in ('queued', 'processing', 'completed', 'failed', 'cancelled')),

  constraint song_shorten_jobs_mode_check
    check (mode in ('smart_trim', 'ai_repair', 'smart_trim_ai_repair'))
);

create index if not exists song_shorten_jobs_song_id_idx
on public.song_shorten_jobs(song_id, created_at desc);

create index if not exists song_shorten_jobs_clerk_user_id_idx
on public.song_shorten_jobs(clerk_user_id, created_at desc);

create index if not exists song_shorten_jobs_status_idx
on public.song_shorten_jobs(status, queued_at asc);

create index if not exists song_shorten_jobs_worker_job_id_idx
on public.song_shorten_jobs(worker_job_id);

create or replace function public.set_song_shorten_jobs_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_song_shorten_jobs_updated_at on public.song_shorten_jobs;
create trigger set_song_shorten_jobs_updated_at
before update on public.song_shorten_jobs
for each row execute function public.set_song_shorten_jobs_updated_at();
