alter table public.artists
  add column if not exists hero_image_position_x smallint not null default 50,
  add column if not exists hero_image_position_y smallint not null default 50;

alter table public.artists
  drop constraint if exists artists_hero_image_position_x_check,
  add constraint artists_hero_image_position_x_check check (hero_image_position_x between 0 and 100),
  drop constraint if exists artists_hero_image_position_y_check,
  add constraint artists_hero_image_position_y_check check (hero_image_position_y between 0 and 100);
