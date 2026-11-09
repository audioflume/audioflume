-- STAGING POST-DEPLOYMENT VERIFICATION ONLY; this file is read-only.
-- Run AFTER staged-auth-rls-lockdown.sql in an isolated staging project.
-- All expected_missing counts must equal ZERO and service_revision_execute TRUE.
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
