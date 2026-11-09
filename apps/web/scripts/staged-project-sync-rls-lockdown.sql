-- STAGING CANDIDATE ONLY. Do not execute against the connected Audioflume
-- database or production. NOT a generated Supabase migration.
-- Project sync Data API access is server-only in the audited application.
-- This file is intentionally separate from staged-auth-rls-lockdown.sql.
-- Review in an isolated staging database first; it does not enable Supabase.
BEGIN;

DO $$
DECLARE
  actual_policy_count integer;
  expected_policy_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'project_sync_operations'
      AND c.relkind IN ('r', 'p')
      AND c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'Project sync lockdown aborted: expected RLS-enabled table missing';
  END IF;

  SELECT count(*) INTO actual_policy_count FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'project_sync_operations';

  SELECT count(*) INTO expected_policy_count FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'project_sync_operations'
    AND policyname IN (
      'Users can insert their project sync operations',
      'Users can read their project sync operations',
      'Users can update their project sync operations'
    )
    AND cmd IN ('INSERT', 'SELECT', 'UPDATE')
    AND roles::text = '{public}';

  IF actual_policy_count <> 3 OR expected_policy_count <> 3 THEN
    RAISE EXCEPTION 'Project sync lockdown aborted: unexpected RLS policies';
  END IF;

  IF NOT (
    has_table_privilege('service_role', 'public.project_sync_operations', 'SELECT')
    AND has_table_privilege('service_role', 'public.project_sync_operations', 'INSERT')
    AND has_table_privilege('service_role', 'public.project_sync_operations', 'UPDATE')
    AND has_table_privilege('service_role', 'public.project_sync_operations', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'Project sync lockdown aborted: service-role access is incomplete';
  END IF;
END
$$;

-- Current browser policies compare auth.jwt()->>'sub' (Supabase UUID)
-- against projects.clerk_user_id (legacy text owner). Do not replace them
-- with a broad authenticated policy. Direct Data API access is not needed.
DROP POLICY "Users can insert their project sync operations" ON public.project_sync_operations;
DROP POLICY "Users can read their project sync operations" ON public.project_sync_operations;
DROP POLICY "Users can update their project sync operations" ON public.project_sync_operations;

REVOKE ALL PRIVILEGES ON TABLE public.project_sync_operations FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  role_name text;
  privilege_name text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'project_sync_operations'
  ) THEN
    RAISE EXCEPTION 'Project sync lockdown failed postcondition: policies remain';
  END IF;

  FOREACH role_name IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH privilege_name IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
      IF has_table_privilege(role_name, 'public.project_sync_operations', privilege_name) THEN
        RAISE EXCEPTION 'Project sync lockdown failed postcondition: % still has %', role_name, privilege_name;
      END IF;
    END LOOP;
  END LOOP;

  IF NOT (
    has_table_privilege('service_role', 'public.project_sync_operations', 'SELECT')
    AND has_table_privilege('service_role', 'public.project_sync_operations', 'INSERT')
    AND has_table_privilege('service_role', 'public.project_sync_operations', 'UPDATE')
    AND has_table_privilege('service_role', 'public.project_sync_operations', 'DELETE')
  ) THEN
    RAISE EXCEPTION 'Project sync lockdown failed postcondition: service role lost access';
  END IF;
END
$$;

COMMIT;
