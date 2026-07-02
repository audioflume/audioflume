alter table public.songs
  add column if not exists ai_generated boolean not null default false;

comment on column public.songs.ai_generated is 'Marks whether the song was made with AI.';
