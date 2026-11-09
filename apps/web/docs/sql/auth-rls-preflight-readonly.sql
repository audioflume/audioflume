-- READ-ONLY PRE-FLIGHT: Supabase Auth RLS cutover audit.
-- This SQL performs SELECTs only. It does NOT enable RLS, change grants,
-- create policies, touch user records, or modify Clerk authorization.
-- Run separately from any eventual rollout SQL.

-- 1. Show every public table still lacking RLS, with database-role
-- privileges. A table with RLS off + role grants is an exposure risk
-- when reachable through a Data API or database connection.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', c.oid, 'select') as anon_select,
  has_table_privilege('anon', c.oid, 'insert') as anon_insert,
  has_table_privilege('anon', c.oid, 'update') as anon_update,
  has_table_privilege('anon', c.oid, 'delete') as anon_delete,
  has_table_privilege('authenticated', c.oid, 'select') as authenticated_select,
  has_table_privilege('authenticated', c.oid, 'insert') as authenticated_insert,
  has_table_privilege('authenticated', c.oid, 'update') as authenticated_update,
  has_table_privilege('authenticated', c.oid, 'delete') as authenticated_delete
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and not c.relrowsecurity
order by c.relname;

-- 2. Identify broad grants and policies on key owned and public tables.
select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  (select count(*) from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname) as policy_count,
  has_table_privilege('anon', c.oid, 'select') as anon_select,
  has_table_privilege('authenticated', c.oid, 'select') as authenticated_select
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'auth_identity_links', 'favorites', 'playlists', 'playlist_songs',
    'projects', 'project_assets', 'project_folders', 'user_profiles',
    'user_billing_profiles', 'user_memberships', 'user_downloads',
    'user_security_events', 'songs', 'song_edit_points',
    'song_shorten_jobs', 'artist_memberships'
  )
order by c.relname;

-- 3. Inspect exposed project folder view attributes and role grants.
-- A view with default creator privileges may bypass underlying RLS.
select c.relname as view_name, c.reloptions,
  has_table_privilege('anon', c.oid, 'select') as anon_select,
  has_table_privilege('authenticated', c.oid, 'select') as authenticated_select
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'v'
  and c.relname = 'project_folder_paths';

-- 4. Confirm owner-link table is still unavailable to browser roles.
select
  c.relrowsecurity as mapping_rls_enabled,
  has_table_privilege('anon', c.oid, 'select') as anon_can_read_mapping,
  has_table_privilege('authenticated', c.oid, 'select') as authenticated_can_read_mapping
from pg_class c
where c.oid = 'public.auth_identity_links'::regclass;

-- 5. Count RLS policies for all public tables (no private row data).
select
  count(*) filter (where not c.relrowsecurity) as tables_without_rls,
  count(*) filter (where c.relrowsecurity) as tables_with_rls,
  count(*) filter (where c.relrowsecurity and not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname
  )) as rls_tables_without_policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r';
