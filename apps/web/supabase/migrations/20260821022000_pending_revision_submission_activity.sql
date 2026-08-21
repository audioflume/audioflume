create or replace function public.sync_song_pending_revision_submission_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_artist_id uuid;
  v_song_title text;
begin
  if new.status <> 'submitted' then
    return new;
  end if;

  if
    tg_op = 'INSERT'
    or old.status is distinct from new.status
    or old.updated_at is distinct from new.updated_at
  then
    update public.songs
    set submitted_at = coalesce(new.updated_at, now())
    where id = new.song_id;
  end if;

  if tg_op = 'INSERT' then
    select sa.artist_id
    into v_artist_id
    from public.song_artists as sa
    where sa.song_id = new.song_id
      and sa.role = 'primary'
    order by sa.position asc
    limit 1;

    if v_artist_id is not null then
      select coalesce(nullif(btrim(new.metadata ->> 'title'), ''), s.title)
      into v_song_title
      from public.songs as s
      where s.id = new.song_id;

      insert into public.artist_notifications (
        artist_id,
        recipient_clerk_user_id,
        kind,
        title,
        message,
        action_url
      )
      select
        v_artist_id,
        recipients.clerk_user_id,
        'track_resubmitted',
        'Track resubmitted: ' || coalesce(v_song_title, 'Track'),
        'Your track has been resubmitted for review.',
        '/artists/dashboard?section=music&artist=' || v_artist_id::text
      from (
        select distinct am.clerk_user_id
        from public.artist_memberships as am
        where am.artist_id = v_artist_id
          and am.clerk_user_id <> ''
      ) as recipients;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists song_pending_revision_submission_activity
on public.song_pending_revisions;

create trigger song_pending_revision_submission_activity
after insert or update of status, updated_at
on public.song_pending_revisions
for each row
execute function public.sync_song_pending_revision_submission_activity();
