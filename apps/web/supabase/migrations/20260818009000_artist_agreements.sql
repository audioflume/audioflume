create table if not exists public.artist_agreement_documents (
  id uuid primary key default gen_random_uuid(),
  document_key text not null,
  version integer not null default 1,
  title text not null,
  summary text,
  document_url text,
  required boolean not null default true,
  status text not null default 'draft',
  position integer not null default 0,
  effective_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint artist_agreement_documents_key_check
    check (length(btrim(document_key)) > 0),
  constraint artist_agreement_documents_title_check
    check (length(btrim(title)) > 0),
  constraint artist_agreement_documents_version_check
    check (version > 0),
  constraint artist_agreement_documents_status_check
    check (status in ('draft', 'published', 'retired')),
  constraint artist_agreement_documents_key_version_unique
    unique (document_key, version)
);

create unique index if not exists artist_agreement_documents_published_key_idx
  on public.artist_agreement_documents (document_key)
  where status = 'published';
create index if not exists artist_agreement_documents_status_position_idx
  on public.artist_agreement_documents (status, position, created_at);

create table if not exists public.artist_agreement_acceptances (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artists(id) on delete cascade,
  agreement_document_id uuid not null references public.artist_agreement_documents(id) on delete restrict,
  accepted_by_clerk_user_id text not null,
  accepted_by_display_name text,
  accepted_at timestamptz not null default now(),

  constraint artist_agreement_acceptances_artist_document_unique
    unique (artist_id, agreement_document_id)
);

create index if not exists artist_agreement_acceptances_artist_idx
  on public.artist_agreement_acceptances (artist_id, accepted_at desc);
create index if not exists artist_agreement_acceptances_document_idx
  on public.artist_agreement_acceptances (agreement_document_id, accepted_at desc);

-- Reuse the account migration's shared updated_at trigger function.
drop trigger if exists set_artist_agreement_documents_updated_at on public.artist_agreement_documents;
create trigger set_artist_agreement_documents_updated_at
before update on public.artist_agreement_documents
for each row execute function public.set_updated_at();

alter table public.artist_agreement_documents enable row level security;
alter table public.artist_agreement_acceptances enable row level security;

revoke all on table public.artist_agreement_documents from anon, authenticated;
revoke all on table public.artist_agreement_acceptances from anon, authenticated;
grant select, insert, update, delete on table public.artist_agreement_documents to service_role;
grant select, insert, update, delete on table public.artist_agreement_acceptances to service_role;

insert into public.artist_agreement_documents (
  document_key,
  version,
  title,
  summary,
  required,
  status,
  position
)
values
  (
    'artist-agreement',
    1,
    'Artist Agreement',
    'Primary artist onboarding agreement.',
    true,
    'draft',
    0
  ),
  (
    'catalogue-rights-confirmation',
    1,
    'Catalogue Rights Confirmation',
    'Rights confirmation for submitted catalogue.',
    true,
    'draft',
    1
  )
on conflict (document_key, version) do nothing;
