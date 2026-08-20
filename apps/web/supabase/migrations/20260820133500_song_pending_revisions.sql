create table if not exists public.song_pending_revisions (
  song_id uuid primary key references public.songs(id) on delete cascade,
  status text not null default 'submitted',
  metadata jsonb,
  credits jsonb,
  rights jsonb,
  rights_holders jsonb,
  audio_url text,
  playback_url text,
  hls_url text,
  waveform_peaks text,
  duration numeric,
  size_bytes bigint,
  submitted_by_clerk_user_id text,
  review_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint song_pending_revisions_status_check
    check (status in ('submitted', 'changes_requested')),
  constraint song_pending_revisions_review_notes_length_check
    check (review_notes is null or char_length(review_notes) <= 4000),
  constraint song_pending_revisions_metadata_check
    check (metadata is null or jsonb_typeof(metadata) = 'object'),
  constraint song_pending_revisions_credits_check
    check (credits is null or jsonb_typeof(credits) = 'array'),
  constraint song_pending_revisions_rights_check
    check (rights is null or jsonb_typeof(rights) = 'object'),
  constraint song_pending_revisions_rights_holders_check
    check (rights_holders is null or jsonb_typeof(rights_holders) = 'array')
);

create index if not exists song_pending_revisions_status_updated_idx
  on public.song_pending_revisions (status, updated_at desc);

alter table public.song_pending_revisions enable row level security;

grant select, insert, update, delete on table public.song_pending_revisions to service_role;

create or replace function public.apply_song_pending_revision(p_song_id uuid)
returns table (
  old_audio_url text,
  old_playback_url text,
  old_hls_url text,
  live_status text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  revision public.song_pending_revisions%rowtype;
  live_song public.songs%rowtype;
  song_metadata jsonb;
begin
  select *
  into revision
  from public.song_pending_revisions
  where song_id = p_song_id
    and status = 'submitted'
  for update;

  if not found then
    raise exception 'No submitted revision found for song %', p_song_id;
  end if;

  select *
  into live_song
  from public.songs
  where id = p_song_id
  for update;

  if not found then
    raise exception 'Song % not found', p_song_id;
  end if;

  song_metadata := coalesce(revision.metadata, '{}'::jsonb);

  update public.songs
  set
    title = case
      when song_metadata ? 'title' then song_metadata->>'title'
      else title
    end,
    bpm = case
      when song_metadata ? 'bpm' then nullif(song_metadata->>'bpm', '')::integer
      else bpm
    end,
    key = case
      when song_metadata ? 'key' then nullif(song_metadata->>'key', '')
      else key
    end,
    genres = case
      when song_metadata ? 'genres' and jsonb_typeof(song_metadata->'genres') = 'array'
        then array(select jsonb_array_elements_text(song_metadata->'genres'))
      else genres
    end,
    moods = case
      when song_metadata ? 'moods' and jsonb_typeof(song_metadata->'moods') = 'array'
        then array(select jsonb_array_elements_text(song_metadata->'moods'))
      else moods
    end,
    regions = case
      when song_metadata ? 'regions' and jsonb_typeof(song_metadata->'regions') = 'array'
        then array(select jsonb_array_elements_text(song_metadata->'regions'))
      else regions
    end,
    instruments = case
      when song_metadata ? 'instruments' and jsonb_typeof(song_metadata->'instruments') = 'array'
        then array(select jsonb_array_elements_text(song_metadata->'instruments'))
      else instruments
    end,
    builds = case
      when song_metadata ? 'builds' and jsonb_typeof(song_metadata->'builds') = 'array'
        then array(select jsonb_array_elements_text(song_metadata->'builds'))
      else builds
    end,
    vocals = case
      when song_metadata ? 'vocals' and jsonb_typeof(song_metadata->'vocals') = 'array'
        then array(select jsonb_array_elements_text(song_metadata->'vocals'))
      else vocals
    end,
    instrumental = case
      when song_metadata ? 'instrumental' then (song_metadata->>'instrumental')::boolean
      else instrumental
    end,
    explicit = case
      when song_metadata ? 'explicit' then (song_metadata->>'explicit')::boolean
      else explicit
    end,
    audio_url = case when revision.audio_url is not null then revision.audio_url else audio_url end,
    playback_url = case when revision.audio_url is not null then revision.playback_url else playback_url end,
    hls_url = case when revision.audio_url is not null then revision.hls_url else hls_url end,
    waveform_peaks = case when revision.audio_url is not null then revision.waveform_peaks else waveform_peaks end,
    duration = case when revision.audio_url is not null then revision.duration else duration end,
    size_bytes = case when revision.audio_url is not null then revision.size_bytes else size_bytes end
  where id = p_song_id;

  if revision.credits is not null then
    delete from public.song_credits where song_id = p_song_id;

    insert into public.song_credits (
      song_id,
      credit_name,
      credit_role,
      position
    )
    select
      p_song_id,
      credit->>'credit_name',
      credit->>'credit_role',
      (ordinality - 1)::integer
    from jsonb_array_elements(revision.credits) with ordinality as rows(credit, ordinality)
    where coalesce(credit->>'credit_name', '') <> ''
      and coalesce(credit->>'credit_role', '') <> '';
  end if;

  if revision.rights is not null then
    insert into public.song_rights (
      song_id,
      master_owner,
      publishing_owner,
      pro_affiliation,
      isrc,
      iswc,
      copyright_year,
      rights_confirmed,
      notes
    )
    values (
      p_song_id,
      nullif(revision.rights->>'master_owner', ''),
      nullif(revision.rights->>'publishing_owner', ''),
      nullif(revision.rights->>'pro_affiliation', ''),
      nullif(revision.rights->>'isrc', ''),
      nullif(revision.rights->>'iswc', ''),
      nullif(revision.rights->>'copyright_year', '')::integer,
      coalesce((revision.rights->>'rights_confirmed')::boolean, false),
      nullif(revision.rights->>'notes', '')
    )
    on conflict (song_id) do update
    set
      master_owner = excluded.master_owner,
      publishing_owner = excluded.publishing_owner,
      pro_affiliation = excluded.pro_affiliation,
      isrc = excluded.isrc,
      iswc = excluded.iswc,
      copyright_year = excluded.copyright_year,
      rights_confirmed = excluded.rights_confirmed,
      notes = excluded.notes,
      updated_at = now();
  end if;

  if revision.rights_holders is not null then
    delete from public.song_rights_holders where song_id = p_song_id;

    insert into public.song_rights_holders (
      song_id,
      holder_name,
      rights_type,
      ownership_percent,
      pro_affiliation,
      ipi_cae_number
    )
    select
      p_song_id,
      holder->>'holder_name',
      holder->>'rights_type',
      nullif(holder->>'ownership_percent', '')::numeric,
      nullif(holder->>'pro_affiliation', ''),
      nullif(holder->>'ipi_cae_number', '')
    from jsonb_array_elements(revision.rights_holders) as rows(holder)
    where coalesce(holder->>'holder_name', '') <> '';
  end if;

  delete from public.song_pending_revisions where song_id = p_song_id;

  return query
  select
    live_song.audio_url,
    live_song.playback_url,
    live_song.hls_url,
    live_song.status;
end;
$$;

revoke all on function public.apply_song_pending_revision(uuid) from public;
grant execute on function public.apply_song_pending_revision(uuid) to service_role;
