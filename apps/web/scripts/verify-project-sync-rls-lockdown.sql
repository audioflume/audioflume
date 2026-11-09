-- READ-ONLY verification after applying staged-project-sync-rls-lockdown.sql
-- to an isolated staging database. Safe to run before as an audit.
-- Do not treat an unexecuted candidate as a completed security rollout.
WITH relation_state AS (
  SELECT c.relrowsecurity AS rls_enabled
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'project_sync_operations'
    AND c.relkind IN ('r', 'p')
), policies AS (
  SELECT count(*) AS policy_count FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'project_sync_operations'
), browser AS (
  SELECT
    bool_or(has_table_privilege(x.role_name, 'public.project_sync_operations', x.privilege_name)) AS any_browser_privilege
  FROM (VALUES
    ('anon', 'SELECT'), ('anon', 'INSERT'), ('anon', 'UPDATE'), ('anon', 'DELETE'),
    ('anon', 'TRUNCATE'), ('anon', 'REFERENCES'), ('anon', 'TRIGGER'),
    ('authenticated', 'SELECT'), ('authenticated', 'INSERT'),
    ('authenticated', 'UPDATE'), ('authenticated', 'DELETE'),
    ('authenticated', 'TRUNCATE'), ('authenticated', 'REFERENCES'),
    ('authenticated', 'TRIGGER')
  ) AS x(role_name, privilege_name)
), privileged AS (
  SELECT
    has_table_privilege('service_role', 'public.project_sync_operations', 'SELECT')
    AND has_table_privilege('service_role', 'public.project_sync_operations', 'INSERT')
    AND has_table_privilege('service_role', 'public.project_sync_operations', 'UPDATE')
    AND has_table_privilege('service_role', 'public.project_sync_operations', 'DELETE') AS service_role_usable
)
SELECT CASE
  WHEN (SELECT count(*) FROM relation_state) = 1
    AND (SELECT rls_enabled FROM relation_state)
    AND (SELECT policy_count FROM policies) = 0
    AND NOT coalesce((SELECT any_browser_privilege FROM browser), true)
    AND (SELECT service_role_usable FROM privileged)
  THEN 'PASS_PROJECT_SYNC_STAGING_LOCKDOWN'
  ELSE 'BLOCKED_PROJECT_SYNC_STAGING_LOCKDOWN'
END AS result,
(SELECT policy_count FROM policies) AS remaining_policies,
(SELECT any_browser_privilege FROM browser) AS browser_has_table_privileges,
(SELECT service_role_usable FROM privileged) AS service_role_access_preserved;
