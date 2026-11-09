-- Audioflume Supabase Auth cutover: READ-ONLY RLS and privilege audit.
-- Run in Supabase SQL Editor on the intended project, or via psql.
-- All statements are SELECT. No migrations, grants, policies, records or roles change.
-- The release requires zero unreviewed RLS-disabled exposed tables, no
-- unrestricted private-table privileges, and explicit acceptance tests.
--
-- 1. RLS state and PUBLIC/anon/authenticated table privileges.
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
  has_table_privilege('anon', c.oid, 'INSERT') AS anon_insert,
  has_table_privilege('anon', c.oid, 'UPDATE') AS anon_update,
  has_table_privilege('anon', c.oid, 'DELETE') AS anon_delete,
  has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select,
  has_table_privilege('authenticated', c.oid, 'INSERT') AS authenticated_insert,
  has_table_privilege('authenticated', c.oid, 'UPDATE') AS authenticated_update,
  has_table_privilege('authenticated', c.oid, 'DELETE') AS authenticated_delete
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('r', 'p')
ORDER BY c.relname;

-- 2. Policies, including which roles and predicates can authorize each operation.
-- Do not assume "TO authenticated" alone establishes ownership.
SELECT
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  permissive,
  qual AS using_predicate,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Identity-link constraints. The mapping must be one-to-one and not
-- writable by anon/authenticated. Never authorize with user_metadata.
SELECT
  conname,
  contype,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.auth_identity_links'::regclass
ORDER BY conname;

SELECT
  has_table_privilege('anon', 'public.auth_identity_links', 'SELECT') AS anon_read_links,
  has_table_privilege('anon', 'public.auth_identity_links', 'INSERT') AS anon_insert_links,
  has_table_privilege('anon', 'public.auth_identity_links', 'UPDATE') AS anon_update_links,
  has_table_privilege('authenticated', 'public.auth_identity_links', 'SELECT') AS authenticated_read_links,
  has_table_privilege('authenticated', 'public.auth_identity_links', 'INSERT') AS authenticated_insert_links,
  has_table_privilege('authenticated', 'public.auth_identity_links', 'UPDATE') AS authenticated_update_links;

-- 4. Public views: a view can bypass underlying table RLS unless it is
-- security_invoker, and a private-data view must not be readable anonymously.
SELECT
  c.relname AS view_name,
  c.reloptions,
  has_table_privilege('anon', c.oid, 'SELECT') AS anon_select,
  has_table_privilege('authenticated', c.oid, 'SELECT') AS authenticated_select
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind IN ('v', 'm')
ORDER BY c.relname;

-- 5. Project sync operations policies: compare actual owner resolution to
-- the Supabase JWT subject (a UUID, not the legacy Clerk owner ID).
SELECT
  tablename, policyname, cmd, roles, qual, with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'project_sync_operations'
ORDER BY policyname;

-- 6. SECURITY DEFINER functions and privilege configuration need manual review.
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  p.prosecdef AS security_definer,
  p.proconfig AS function_settings
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.prokind = 'f'
ORDER BY p.proname;
