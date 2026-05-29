import { currentUser } from '@clerk/nextjs/server'

/**
 * Admin access is determined by two methods (either is sufficient):
 *
 * 1. Clerk publicMetadata role (recommended):
 *    In the Clerk dashboard, set publicMetadata: { role: 'admin' } on admin users.
 *
 * 2. ADMIN_EMAILS env var (fallback):
 *    Add ADMIN_EMAILS=you@example.com,other@example.com to .env.local
 *    This is never committed to the repository.
 */
export async function requireAdmin() {
  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress

  // Check Clerk publicMetadata role
  const isAdminByRole =
    (user?.publicMetadata as Record<string, unknown> | undefined)?.role === 'admin'

  // Fallback: server-side env var (comma-separated, no NEXT_PUBLIC_ prefix)
  const adminEmailsEnv = process.env.ADMIN_EMAILS ?? ''
  const adminEmails = adminEmailsEnv
    .split(',')
    .map((e) => e.trim())
    .filter(Boolean)
  const isAdminByEmail = Boolean(email && adminEmails.includes(email))

  const isAdmin = isAdminByRole || isAdminByEmail

  return {
    isAdmin,
    user,
    email,
  }
}
