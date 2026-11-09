-- STAGING CANDIDATE ONLY. Do not execute against the production project.
-- 2026-11-09: Audioflume exposed-public-schema access lockdown.
-- Baseline: each listed table had RLS disabled and direct full privileges
-- granted to anon and authenticated; service_role already has privileges.
--
-- This intentionally grants NO direct client access. Published songs,
-- public playlists and member-owned data must be served by reviewed server
-- APIs or separately reviewed restricted policies/views.
--
-- Before applying in staging:
-- * Audit EVERY browser client, function, view and external Data API consumer.
-- * Run signed-in/guest music, playlist and desktop sync smoke tests.
-- * Validate any RPC requiring an invoker's table privileges.
-- * Do not activate Supabase Auth during this security rollout.
--
-- This file is NOT a generated Supabase migration. Once staging tests pass,
-- generate a reviewed migration with 'supabase migration new ...'.
BEGIN;

-- Strict preflight: these tables must be the expected plain public relations.
DO $$
DECLARE missing_tables text[];
BEGIN
  SELECT array_agg(missing.name) INTO missing_tables
  FROM unnest(ARRAY[
    'favorites',
    'playlist_songs',
    'playlists',
    'project_assets',
    'project_folders',
    'projects',
    'song_edit_points',
    'song_shorten_jobs',
    'songs',
    'user_billing_profiles',
    'user_downloads',
    'user_memberships',
    'user_profiles',
    'user_security_events'
  ]::text[]) AS missing(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = missing.name AND c.relkind IN ('r', 'p')
  );
  IF missing_tables IS NOT NULL THEN
    RAISE EXCEPTION 'RLS lockdown aborted: expected tables missing: %', missing_tables;
  END IF;
END
$$;

-- The pending-revision apply RPC is SECURITY DEFINER and directly callable
-- as anon/authenticated in the live grant snapshot. Only privileged server-side
-- code needs to execute it. Its trigger companion also has broad EXECUTE grants.
-- Check exact signatures first so this transaction cannot silently skip them.
DO $$
BEGIN
  IF to_regprocedure('public.apply_song_pending_revision(uuid)') IS NULL
    OR to_regprocedure('public.sync_song_pending_revision_submission_activity()') IS NULL THEN
    RAISE EXCEPTION 'RLS lockdown aborted: pending-revision function signatures changed';
  END IF;
END
$$;

-- Enabling RLS without permissive policies denies browser clients. Server-only
-- service_role queries remain authorized, but still require app-side owner checks.
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_edit_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_shorten_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_billing_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_security_events ENABLE ROW LEVEL SECURITY;

-- Revoke the existing direct Data API privileges. No replacement broad
-- authenticated policies are added: authentication is not authorization.
REVOKE ALL PRIVILEGES ON TABLE public.favorites FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.playlist_songs FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.playlists FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.project_assets FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.project_folders FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.projects FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.song_edit_points FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.song_shorten_jobs FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.songs FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.user_billing_profiles FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.user_downloads FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.user_memberships FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.user_profiles FROM anon, authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.user_security_events FROM anon, authenticated;

-- The recursive folder-path view previously ran with its owner's privileges
-- and was directly readable by anon. Both dimensions must be closed.
REVOKE ALL PRIVILEGES ON TABLE public.project_folder_paths FROM anon, authenticated;
ALTER VIEW public.project_folder_paths SET (security_invoker = true);

-- The server's song revision review route uses the service-role RPC.
-- Do not change function bodies or their trusted server EXECUTE privileges.
-- Revoking PUBLIC matters because explicit anon revocation alone would not
-- remove an inherited PUBLIC function grant.
REVOKE ALL PRIVILEGES ON FUNCTION public.apply_song_pending_revision(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL PRIVILEGES ON FUNCTION public.sync_song_pending_revision_submission_activity()
  FROM PUBLIC, anon, authenticated;

-- Abort the transaction if any browser SQL privilege or RLS gap remains.
DO $$
DECLARE unsafe_count integer;
BEGIN
  SELECT COUNT(*) INTO unsafe_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relname = ANY(ARRAY[
      'favorites',
      'playlist_songs',
      'playlists',
      'project_assets',
      'project_folders',
      'projects',
      'song_edit_points',
      'song_shorten_jobs',
      'songs',
      'user_billing_profiles',
      'user_downloads',
      'user_memberships',
      'user_profiles',
      'user_security_events'
    ]::text[])
    AND (
      NOT c.relrowsecurity
      OR has_table_privilege('anon', c.oid, 'SELECT')
      OR has_table_privilege('anon', c.oid, 'INSERT')
      OR has_table_privilege('anon', c.oid, 'UPDATE')
      OR has_table_privilege('anon', c.oid, 'DELETE')
      OR has_table_privilege('authenticated', c.oid, 'SELECT')
      OR has_table_privilege('authenticated', c.oid, 'INSERT')
      OR has_table_privilege('authenticated', c.oid, 'UPDATE')
      OR has_table_privilege('authenticated', c.oid, 'DELETE')
    );

  IF unsafe_count <> 0 THEN
    RAISE EXCEPTION 'RLS lockdown failed postcondition on % tables', unsafe_count;
  END IF;

  IF has_function_privilege('anon', 'public.apply_song_pending_revision(uuid)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.apply_song_pending_revision(uuid)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.sync_song_pending_revision_submission_activity()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.sync_song_pending_revision_submission_activity()', 'EXECUTE') THEN
    RAISE EXCEPTION 'Privileged song revision function still executable by browser roles';
  END IF;

  IF NOT has_function_privilege('service_role', 'public.apply_song_pending_revision(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Server revision application lost required execute privilege';
  END IF;

  IF has_table_privilege('anon', 'public.project_folder_paths', 'SELECT')
    OR has_table_privilege('authenticated', 'public.project_folder_paths', 'SELECT') THEN
    RAISE EXCEPTION 'Project folder view still exposed';
  END IF;
END
$$;

COMMIT;
