-- STAGING CANDIDATE ONLY — not authorized for production execution.
-- Emergency-scoped revision RPC permissions, separate from the 14-table RLS plan.
-- Does not change function bodies, tables, rows, policies, or service role.
BEGIN;

DO $$
DECLARE
  function_name text;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'public.apply_song_pending_revision(uuid)',
    'public.sync_song_pending_revision_submission_activity()'
  ] LOOP
    IF to_regprocedure(function_name) IS NULL THEN
      RAISE EXCEPTION 'Song revision permission preflight failed: function % missing', function_name;
    END IF;
    IF NOT has_function_privilege('service_role', to_regprocedure(function_name), 'EXECUTE') THEN
      RAISE EXCEPTION 'Song revision permission preflight failed: service_role cannot execute %', function_name;
    END IF;
  END LOOP;

  IF NOT (
    SELECT prosecdef FROM pg_proc
    WHERE oid = to_regprocedure('public.apply_song_pending_revision(uuid)')
  ) THEN
    RAISE EXCEPTION 'Song revision permission preflight failed: function security mode changed';
  END IF;
END
$$;

REVOKE ALL PRIVILEGES ON FUNCTION public.apply_song_pending_revision(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.sync_song_pending_revision_submission_activity()
  FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  function_name text;
  role_name text;
BEGIN
  FOREACH function_name IN ARRAY ARRAY[
    'public.apply_song_pending_revision(uuid)',
    'public.sync_song_pending_revision_submission_activity()'
  ] LOOP
    FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_function_privilege(role_name, to_regprocedure(function_name), 'EXECUTE') THEN
        RAISE EXCEPTION 'Song revision permission postcondition failed: role % still executes %', role_name, function_name;
      END IF;
    END LOOP;

    IF NOT has_function_privilege('service_role', to_regprocedure(function_name), 'EXECUTE') THEN
      RAISE EXCEPTION 'Song revision permission postcondition failed: service_role lost %', function_name;
    END IF;
  END LOOP;
END
$$;

COMMIT;
