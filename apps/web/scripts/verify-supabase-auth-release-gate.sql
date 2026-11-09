-- READ-ONLY Supabase auth cutover security gate. Never changes data or permissions.
-- This covers the confirmed RLS, song revision RPC and project folder view blockers.
-- A PASS here is necessary but not sufficient: signed-in web/desktop and staging
-- RLS tests are separate release requirements.
WITH public_tables AS (
  SELECT c.oid, c.relname
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind IN ('r', 'p')
    AND NOT c.relrowsecurity
), revision_functions AS (
  SELECT signature, to_regprocedure(signature) AS function_oid
  FROM (VALUES
    ('public.apply_song_pending_revision(uuid)'),
    ('public.sync_song_pending_revision_submission_activity()')
  ) AS expected(signature)
), revision_status AS (
  SELECT
    count(*) FILTER (WHERE function_oid IS NULL) AS missing_functions,
    count(*) FILTER (WHERE
      coalesce(has_function_privilege('anon', function_oid, 'EXECUTE'), true)
      OR coalesce(has_function_privilege('authenticated', function_oid, 'EXECUTE'), true)
    ) AS browser_executable_functions,
    count(*) FILTER (WHERE NOT coalesce(has_function_privilege('service_role', function_oid, 'EXECUTE'), false)) AS service_inaccessible_functions
  FROM revision_functions
), folder_view AS (
  SELECT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'project_folder_paths'
      AND c.relkind = 'v'
      AND coalesce('security_invoker=true' = ANY(c.reloptions), false)
  ) AS is_security_invoker
)
SELECT
  CASE WHEN (SELECT count(*) FROM public_tables) = 0
    AND r.missing_functions = 0
    AND r.browser_executable_functions = 0
    AND r.service_inaccessible_functions = 0
    AND v.is_security_invoker
  THEN 'PASS_SUPABASE_AUTH_SECURITY'
  ELSE 'BLOCKED_SUPABASE_AUTH_SECURITY'
  END AS security_gate,
  (SELECT count(*) FROM public_tables) AS public_tables_without_rls,
  (SELECT coalesce(array_agg(relname ORDER BY relname), ARRAY[]::name[]) FROM public_tables) AS unprotected_tables,
  r.missing_functions,
  r.browser_executable_functions,
  r.service_inaccessible_functions,
  NOT v.is_security_invoker AS project_folder_paths_view_not_security_invoker
FROM revision_status r CROSS JOIN folder_view v;
