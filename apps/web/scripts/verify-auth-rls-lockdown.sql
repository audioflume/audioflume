-- STAGING POST-DEPLOYMENT VERIFICATION ONLY; this file is read-only.
-- Run AFTER staged-auth-rls-lockdown.sql in an isolated staging project.
-- Confirm the final staging_release_gate is PASS and service_revision_execute TRUE.
-- This does not test website behavior, RPC argument authorization or RLS row
-- isolation. Perform separate anon/account/desktop browser smoke tests.
--
-- 14-table RLS state + remaining browser privileges:
SELECT
  count(*) FILTER (WHERE NOT c.relrowsecurity) AS rls_disabled_tables,
  count(*) FILTER (
    WHERE has_table_privilege('anon', c.oid, 'SELECT')
      OR has_table_privilege('anon', c.oid, 'INSERT')
      OR has_table_privilege('anon', c.oid, 'UPDATE')
      OR has_table_privilege('anon', c.oid, 'DELETE')
      OR has_table_privilege('authenticated', c.oid, 'SELECT')
      OR has_table_privilege('authenticated', c.oid, 'INSERT')
      OR has_table_privilege('authenticated', c.oid, 'UPDATE')
      OR has_table_privilege('authenticated', c.oid, 'DELETE')
  ) AS exposed_tables_remaining
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relkind IN ('r','p')
AND c.relname = ANY(ARRAY[
  'favorites','playlist_songs','playlists','project_assets',
  'project_folders','projects','song_edit_points','song_shorten_jobs',
  'songs','user_billing_profiles','user_downloads','user_memberships',
  'user_profiles','user_security_events'
]::text[]);

-- The folder path view must not bypass owner checks or be readable directly.
SELECT
  coalesce('security_invoker=true' = ANY(c.reloptions), false) AS invoker_security_enabled,
  has_table_privilege('anon', c.oid, 'SELECT') AS anon_can_read,
  has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_can_read
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'project_folder_paths' AND c.relkind = 'v';

-- Privileged song revision execution must not be granted to client roles.
SELECT
  has_function_privilege('anon', 'public.apply_song_pending_revision(uuid)', 'EXECUTE') AS anon_revision_execute,
  has_function_privilege('authenticated', 'public.apply_song_pending_revision(uuid)', 'EXECUTE') AS authenticated_revision_execute,
  has_function_privilege('service_role', 'public.apply_song_pending_revision(uuid)', 'EXECUTE') AS service_revision_execute,
  has_function_privilege('anon', 'public.sync_song_pending_revision_submission_activity()', 'EXECUTE') AS anon_trigger_execute,
  has_function_privilege('authenticated', 'public.sync_song_pending_revision_submission_activity()', 'EXECUTE') AS authenticated_trigger_execute;

-- Complete release gate. Missing tables, view, or functions FAIL the check;
-- a count of zero unsafe tables alone is not proof all 14 expected tables exist.
WITH expected_tables(name) AS (
  SELECT unnest(ARRAY[
    'favorites','playlist_songs','playlists','project_assets',
    'project_folders','projects','song_edit_points','song_shorten_jobs',
    'songs','user_billing_profiles','user_downloads','user_memberships',
    'user_profiles','user_security_events'
  ]::text[])
), table_check AS (
  SELECT
    count(c.oid) AS present_tables,
    count(c.oid) FILTER (
      WHERE c.relrowsecurity
        AND NOT has_table_privilege('anon', c.oid, 'SELECT')
        AND NOT has_table_privilege('anon', c.oid, 'INSERT')
        AND NOT has_table_privilege('anon', c.oid, 'UPDATE')
        AND NOT has_table_privilege('anon', c.oid, 'DELETE')
        AND NOT has_table_privilege('authenticated', c.oid, 'SELECT')
        AND NOT has_table_privilege('authenticated', c.oid, 'INSERT')
        AND NOT has_table_privilege('authenticated', c.oid, 'UPDATE')
        AND NOT has_table_privilege('authenticated', c.oid, 'DELETE')
    ) AS secured_tables
  FROM expected_tables e
  LEFT JOIN pg_namespace n ON n.nspname = 'public'
  LEFT JOIN pg_class c ON c.relnamespace = n.oid
    AND c.relname = e.name AND c.relkind IN ('r', 'p')
), view_check AS (
  SELECT
    count(c.oid) AS present_views,
    count(c.oid) FILTER (
      WHERE 'security_invoker=true' = ANY(c.reloptions)
        AND NOT has_table_privilege('anon', c.oid, 'SELECT')
        AND NOT has_table_privilege('authenticated', c.oid, 'SELECT')
    ) AS secured_views
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = 'project_folder_paths'
    AND c.relkind = 'v'
), function_check AS (
  SELECT
    to_regprocedure('public.apply_song_pending_revision(uuid)') IS NOT NULL
      AND to_regprocedure('public.sync_song_pending_revision_submission_activity()') IS NOT NULL
      AND NOT coalesce(has_function_privilege('anon', to_regprocedure('public.apply_song_pending_revision(uuid)'), 'EXECUTE'), true)
      AND NOT coalesce(has_function_privilege('authenticated', to_regprocedure('public.apply_song_pending_revision(uuid)'), 'EXECUTE'), true)
      AND NOT coalesce(has_function_privilege('anon', to_regprocedure('public.sync_song_pending_revision_submission_activity()'), 'EXECUTE'), true)
      AND NOT coalesce(has_function_privilege('authenticated', to_regprocedure('public.sync_song_pending_revision_submission_activity()'), 'EXECUTE'), true)
      AND coalesce(has_function_privilege('service_role', to_regprocedure('public.apply_song_pending_revision(uuid)'), 'EXECUTE'), false)
    AS functions_secured
)
SELECT
  CASE WHEN t.present_tables = 14 AND t.secured_tables = 14
    AND v.present_views = 1 AND v.secured_views = 1
    AND f.functions_secured
    THEN 'PASS_STAGING_SQL_GATE'
    ELSE 'BLOCKED_STAGING_SQL_GATE'
  END AS staging_release_gate,
  t.present_tables, t.secured_tables, v.present_views, v.secured_views,
  f.functions_secured
FROM table_check t CROSS JOIN view_check v CROSS JOIN function_check f;
