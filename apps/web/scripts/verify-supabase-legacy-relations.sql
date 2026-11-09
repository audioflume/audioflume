-- READ-ONLY legacy relation inventory for Supabase auth staging.
-- Report aggregate counts only. Missing parent records require review, not deletion.
-- This is diagnostic, not a release gate; preserved legacy records may be intentional.
WITH checks AS (
  SELECT
    'playlist_songs_to_playlists'::text AS relationship,
    count(*)::bigint AS total_children,
    count(*) FILTER (WHERE p.id IS NOT NULL)::bigint AS matched_children,
    count(*) FILTER (WHERE p.id IS NULL)::bigint AS unmatched_children,
    count(DISTINCT x.playlist_id) FILTER (WHERE p.id IS NULL)::bigint AS distinct_unmatched_parent_ids
  FROM public.playlist_songs x
  LEFT JOIN public.playlists p ON p.id = x.playlist_id

  UNION ALL

  SELECT 'project_assets_to_projects',
    count(*)::bigint,
    count(*) FILTER (WHERE p.id IS NOT NULL)::bigint,
    count(*) FILTER (WHERE p.id IS NULL)::bigint,
    count(DISTINCT x.project_id) FILTER (WHERE p.id IS NULL)::bigint
  FROM public.project_assets x
  LEFT JOIN public.projects p ON p.id = x.project_id

  UNION ALL

  SELECT 'project_folders_to_projects',
    count(*)::bigint,
    count(*) FILTER (WHERE p.id IS NOT NULL)::bigint,
    count(*) FILTER (WHERE p.id IS NULL)::bigint,
    count(DISTINCT x.project_id) FILTER (WHERE p.id IS NULL)::bigint
  FROM public.project_folders x
  LEFT JOIN public.projects p ON p.id = x.project_id

  UNION ALL

  SELECT 'song_edit_points_to_songs',
    count(*)::bigint,
    count(*) FILTER (WHERE s.id IS NOT NULL)::bigint,
    count(*) FILTER (WHERE s.id IS NULL)::bigint,
    count(DISTINCT x.song_id) FILTER (WHERE s.id IS NULL)::bigint
  FROM public.song_edit_points x
  LEFT JOIN public.songs s ON s.id::text = x.song_id

  UNION ALL

  SELECT 'favorites_to_songs',
    count(*)::bigint,
    count(*) FILTER (WHERE s.id IS NOT NULL)::bigint,
    count(*) FILTER (WHERE s.id IS NULL)::bigint,
    count(DISTINCT x.song_id) FILTER (WHERE s.id IS NULL)::bigint
  FROM public.favorites x
  LEFT JOIN public.songs s ON s.id::text = x.song_id

  UNION ALL

  SELECT 'user_downloads_to_user_profiles',
    count(*)::bigint,
    count(*) FILTER (WHERE p.clerk_user_id IS NOT NULL)::bigint,
    count(*) FILTER (WHERE p.clerk_user_id IS NULL)::bigint,
    count(DISTINCT x.clerk_user_id) FILTER (WHERE p.clerk_user_id IS NULL)::bigint
  FROM public.user_downloads x
  LEFT JOIN public.user_profiles p ON p.clerk_user_id = x.clerk_user_id
)
SELECT relationship, total_children, matched_children, unmatched_children,
       distinct_unmatched_parent_ids,
       CASE WHEN unmatched_children = 0 THEN 'MATCHED' ELSE 'REVIEW_LEGACY_RELATION' END AS relationship_status
FROM checks ORDER BY relationship;
