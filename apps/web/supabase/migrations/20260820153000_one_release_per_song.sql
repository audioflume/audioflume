do $$
begin
  if exists (
    select 1
    from public.artist_release_songs
    group by song_id
    having count(*) > 1
  ) then
    raise exception 'Cannot enforce one release per song while duplicate release memberships exist';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'artist_release_songs_song_unique'
      and conrelid = 'public.artist_release_songs'::regclass
  ) then
    alter table public.artist_release_songs
      add constraint artist_release_songs_song_unique unique (song_id);
  end if;
end
$$;
