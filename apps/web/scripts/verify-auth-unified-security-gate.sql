-- READ ONLY: unified Audioflume Supabase authentication release-security gate.
-- This SELECT can be run BEFORE or AFTER the two staging SQL candidates.
-- It must report BLOCKED until every reviewed condition passes. It does not
-- certify signed-in workflows, a production build, provider flags or deployment.
WITH expected_tables(name) AS (
  SELECT unnest(ARRAY[
    'favorites', 'playlist_songs', 'playlists', 'project_assets',
    'project_folders', 'projects', 'song_edit_points', 'song_shorten_jobs',
    'songs', 'user_billing_profiles', 'user_downloads', 'user_memberships',
    'user_profiles', 'user_security_events'
  ]::text[])
), table_state AS (
  SELECT count(c.oid) AS found,
    count(c.oid) FILTER (WHERE c.relrowsecurity
      AND NOT coalesce(has_table_privilege('anon', c.oid, 'SELECT'), false)
      AND NOT coalesce(has_table_privilege('anon', c.oid, 'INSERT'), false)
      AND NOT coalesce(has_table_privilege('anon', c.oid, 'UPDATE'), false)
      AND NOT coalesce(has_table_privilege('anon', c.oid, 'DELETE'), false)
      AND NOT coalesce(has_table_privilege('authenticated', c.oid, 'SELECT'), false)
      AND NOT coalesce(has_table_privilege('authenticated', c.oid, 'INSERT'), false)
      AND NOT coalesce(has_table_privilege('authenticated', c.oid, 'UPDATE'), false)
      AND NOT coalesce(has_table_privilege('authenticated', c.oid, 'DELETE'), false)
    ) AS secured
  FROM expected_tables e
  LEFT JOIN pg_namespace n ON n.nspname = 'public'
  LEFT JOIN pg_class c ON c.relnamespace = n.oid
    AND c.relname = e.name AND c.relkind IN ('r', 'p')
), view_state AS (
  SELECT count(c.oid) AS found,
    count(c.oid) FILTER (WHERE
      'security_invoker=true' = ANY(c.reloptions)
      AND NOT has_table_privilege('anon', c.oid, 'SELECT')
      AND NOT has_table_privilege('authenticated', c.oid, 'SELECT')
    ) AS secured
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'project_folder_paths' AND c.relkind = 'v'
), function_state AS (
  SELECT
    to_regprocedure('public.apply_song_pending_revision(uuid)') IS NOT NULL
    AND to_regprocedure('public.sync_song_pending_revision_submission_activity()') IS NOT NULL
    AND NOT coalesce(has_function_privilege('anon', to_regprocedure('public.apply_song_pending_revision(uuid)'), 'EXECUTE'), true)
    AND NOT coalesce(has_function_privilege('authenticated', to_regprocedure('public.apply_song_pending_revision(uuid)'), 'EXECUTE'), true)
    AND NOT coalesce(has_function_privilege('anon', to_regprocedure('public.sync_song_pending_revision_submission_activity()'), 'EXECUTE'), true)
    AND NOT coalesce(has_function_privilege('authenticated', to_regprocedure('public.sync_song_pending_revision_submission_activity()'), 'EXECUTE'), true)
    AND coalesce(has_function_privilege('service_role', to_regprocedure('public.apply_song_pending_revision(uuid)'), 'EXECUTE'), false)
    AS secured
), sync_state AS (
  SELECT count(c.oid) AS found,
    bool_and(c.relrowsecurity
      AND NOT coalesce(has_table_privilege('anon', c.oid, 'SELECT'), false)
      AND NOT coalesce(has_table_privilege('anon', c.oid, 'INSERT'), false)
      AND NOT coalesce(has_table_privilege('anon', c.oid, 'UPDATE'), false)
      AND NOT coalesce(has_table_privilege('anon', c.oid, 'DELETE'), false)
      AND NOT coalesce(has_table_privilege('authenticated', c.oid, 'SELECT'), false)
      AND NOT coalesce(has_table_privilege('authenticated', c.oid, 'INSERT'), false)
      AND NOT coalesce(has_table_privilege('authenticated', c.oid, 'UPDATE'), false)
      AND NOT coalesce(has_table_privilege('authenticated', c.oid, 'DELETE'), false)
      AND has_table_privilege('service_role', c.oid, 'SELECT')
      AND has_table_privilege('service_role', c.oid, 'INSERT')
      AND has_table_privilege('service_role', c.oid, 'UPDATE')
      AND has_table_privilege('service_role', c.oid, 'DELETE')
    ) AS privileges_secured
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'project_sync_operations'
    AND c.relkind IN ('r', 'p')
), sync_policies AS (
  SELECT count(*) AS policy_count FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'project_sync_operations'
)
SELECT CASE
  WHEN t.found = 14 AND t.secured = 14
    AND v.found = 1 AND v.secured = 1
    AND f.secured
    AND s.found = 1 AND coalesce(s.privileges_secured, false)
    AND p.policy_count = 0
  THEN 'PASS_STAGING_SECURITY_GATE'
  ELSE 'BLOCKED_STAGING_SECURITY_GATE'
END AS staging_security_gate,
  t.found AS expected_tables_found,
  t.secured AS expected_tables_secured,
  v.found AS folder_views_found,
  v.secured AS folder_views_secured,
  f.secured AS privileged_functions_secured,
  s.found AS project_sync_tables_found,
  coalesce(s.privileges_secured, false) AS project_sync_privileges_secured,
  p.policy_count AS project_sync_policies_remaining
FROM table_state t CROSS JOIN view_state v CROSS JOIN function_state f
CROSS JOIN sync_state s CROSS JOIN sync_policies p;
