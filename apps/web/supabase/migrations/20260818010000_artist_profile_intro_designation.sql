alter table public.artists
  add column if not exists designation text,
  add column if not exists intro_text text;
