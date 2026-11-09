-- READ-ONLY staging or production permissions audit; no DDL and no mutations.
WITH expected(name) AS (
  SELECT unnest(ARRAY[
    'public.apply_song_pending_revision(uuid)',
    'public.sync_song_pending_revision_submission_activity()'
  ]::text[])
), status AS (
  SELECT e.name, to_regprocedure(e.name) AS function_oid,
    coalesce(has_function_privilege('anon', to_regprocedure(e.name), 'EXECUTE'), true) AS anon_can_execute,
    coalesce(has_function_privilege('authenticated', to_regprocedure(e.name), 'EXECUTE'), true) AS authenticated_can_execute,
    coalesce(has_function_privilege('service_role', to_regprocedure(e.name), 'EXECUTE'), false) AS service_can_execute
  FROM expected e
)
SELECT CASE WHEN count(*) = 2
  AND count(*) FILTER (WHERE function_oid IS NOT NULL AND
    NOT anon_can_execute AND NOT authenticated_can_execute AND service_can_execute) = 2
  THEN 'PASS_SONG_REVISION_RPC_SECURITY'
  ELSE 'BLOCKED_SONG_REVISION_RPC_SECURITY'
  END AS security_gate,
  count(*) FILTER (WHERE function_oid IS NULL) AS missing_functions,
  count(*) FILTER (WHERE anon_can_execute OR authenticated_can_execute) AS browser_executable_functions,
  count(*) FILTER (WHERE NOT service_can_execute) AS server_inaccessible_functions
FROM status;
