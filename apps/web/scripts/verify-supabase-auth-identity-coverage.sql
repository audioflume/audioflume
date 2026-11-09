-- READ-ONLY account identity-link coverage for Clerk -> Supabase Auth cutover.
-- Counts distinct legacy owners in the core user-owned tables; never exports IDs.
-- No automatic email matching or identity-link creation.
-- Historical/unused legacy owners may require explicit disposition before cutover.
WITH legacy_owners AS (
  SELECT clerk_user_id FROM public.user_profiles
  UNION SELECT clerk_user_id FROM public.playlists
  UNION SELECT clerk_user_id FROM public.projects
  UNION SELECT clerk_user_id FROM public.favorites
  UNION SELECT clerk_user_id FROM public.user_memberships
  UNION SELECT clerk_user_id FROM public.user_billing_profiles
), nonblank_owners AS (
  SELECT clerk_user_id
  FROM legacy_owners
  WHERE clerk_user_id IS NOT NULL AND btrim(clerk_user_id) <> ''
), counts AS (
  SELECT
    (SELECT count(*) FROM nonblank_owners) AS distinct_legacy_owners,
    (SELECT count(*) FROM public.auth_identity_links) AS identity_links,
    (SELECT count(*) FROM nonblank_owners o WHERE EXISTS (
      SELECT 1 FROM public.auth_identity_links l
      WHERE l.clerk_user_id = o.clerk_user_id
    )) AS legacy_owners_with_verified_link,
    (SELECT count(*) FROM nonblank_owners o WHERE NOT EXISTS (
      SELECT 1 FROM public.auth_identity_links l
      WHERE l.clerk_user_id = o.clerk_user_id
    )) AS legacy_owners_without_verified_link,
    (SELECT count(*) FROM (
      SELECT clerk_user_id FROM public.auth_identity_links
      GROUP BY clerk_user_id HAVING count(*) > 1
    ) duplicates) AS duplicate_legacy_identity_links,
    (SELECT count(*) FROM (
      SELECT supabase_user_id FROM public.auth_identity_links
      GROUP BY supabase_user_id HAVING count(*) > 1
    ) duplicates) AS duplicate_supabase_identity_links
)
SELECT CASE
  WHEN legacy_owners_without_verified_link = 0
    AND duplicate_legacy_identity_links = 0
    AND duplicate_supabase_identity_links = 0
  THEN 'PASS_IDENTITY_COVERAGE'
  ELSE 'BLOCKED_IDENTITY_COVERAGE'
END AS identity_coverage_gate,
  distinct_legacy_owners,
  identity_links,
  legacy_owners_with_verified_link,
  legacy_owners_without_verified_link,
  duplicate_legacy_identity_links,
  duplicate_supabase_identity_links
FROM counts;
