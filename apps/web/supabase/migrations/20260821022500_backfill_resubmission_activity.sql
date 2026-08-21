with review_activity as (
  select
    song_id,
    max(created_at) filter (where action = 'changes_requested') as last_changes_requested_at,
    max(created_at) filter (where action = 'approved') as last_approved_at
  from public.song_review_events
  group by song_id
)
update public.songs as songs
set submitted_at = review_activity.last_approved_at
from review_activity
where review_activity.song_id = songs.id
  and songs.status in ('approved', 'published')
  and review_activity.last_changes_requested_at is not null
  and review_activity.last_approved_at is not null
  and review_activity.last_approved_at > review_activity.last_changes_requested_at
  and (
    songs.submitted_at is null
    or songs.submitted_at < review_activity.last_changes_requested_at
  );
