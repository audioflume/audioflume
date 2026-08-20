alter table public.songs
  add column if not exists standalone_cover_url text;

update public.songs
set standalone_cover_url = cover_url
where standalone_cover_url is null;

create or replace function public.preserve_standalone_song_cover()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  release_cover_url text;
begin
  if tg_op = 'INSERT' then
    if new.standalone_cover_url is null then
      new.standalone_cover_url := new.cover_url;
    end if;
    return new;
  end if;

  select ar.cover_image_url
  into release_cover_url
  from public.artist_release_songs ars
  join public.artist_releases ar on ar.id = ars.release_id
  where ars.song_id = new.id
  limit 1;

  if found then
    if new.cover_url is distinct from release_cover_url then
      new.standalone_cover_url := new.cover_url;
    end if;

    new.cover_url := coalesce(release_cover_url, new.standalone_cover_url);
  else
    new.standalone_cover_url := new.cover_url;
  end if;

  return new;
end;
$$;

drop trigger if exists songs_preserve_standalone_cover on public.songs;
create trigger songs_preserve_standalone_cover
before insert or update of cover_url on public.songs
for each row
execute function public.preserve_standalone_song_cover();

create or replace function public.sync_song_cover_for_release_membership()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  release_cover_url text;
begin
  if tg_op = 'INSERT' then
    select cover_image_url
    into release_cover_url
    from public.artist_releases
    where id = new.release_id;

    if release_cover_url is not null then
      update public.songs
      set cover_url = release_cover_url
      where id = new.song_id;
    end if;

    return new;
  end if;

  update public.songs
  set cover_url = standalone_cover_url
  where id = old.song_id;

  return old;
end;
$$;

drop trigger if exists artist_release_songs_sync_cover on public.artist_release_songs;
create trigger artist_release_songs_sync_cover
after insert or delete on public.artist_release_songs
for each row
execute function public.sync_song_cover_for_release_membership();

create or replace function public.sync_release_artwork_to_member_songs()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.cover_image_url is distinct from old.cover_image_url then
    update public.songs s
    set cover_url = coalesce(new.cover_image_url, s.standalone_cover_url)
    from public.artist_release_songs ars
    where ars.release_id = new.id
      and s.id = ars.song_id;
  end if;

  return new;
end;
$$;

drop trigger if exists artist_releases_sync_member_song_covers on public.artist_releases;
create trigger artist_releases_sync_member_song_covers
after update of cover_image_url on public.artist_releases
for each row
execute function public.sync_release_artwork_to_member_songs();

update public.songs s
set cover_url = ar.cover_image_url
from public.artist_release_songs ars
join public.artist_releases ar on ar.id = ars.release_id
where ars.song_id = s.id
  and ar.cover_image_url is not null
  and s.cover_url is distinct from ar.cover_image_url;
