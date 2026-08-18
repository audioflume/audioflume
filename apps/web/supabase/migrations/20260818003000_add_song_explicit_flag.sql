alter table public.songs
add column if not exists explicit boolean not null default false;
