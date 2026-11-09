import { currentUser } from '@clerk/nextjs/server'
import { selectAccountAuthProvider } from '@/lib/auth/selectAccountAuthProvider'
import { isTrustedSupabaseAdmin } from '@/lib/auth/isTrustedSupabaseAdmin'
import { resolveAccountOwner } from '@/lib/auth/resolveAccountOwner'
import { supabaseServer } from '@/lib/supabaseServer'

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
  // Supabase authorization uses a verified linked owner and a fresh server-
  // trusted Auth Admin API read. Never consult Clerk's current browser user.
  if (selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === 'supabase') {
    const owner = await resolveAccountOwner()
    if (!owner.userId || !owner.supabaseUserId) {
      return { isAdmin: false, user: null, email: undefined }
    }

    if (process.env.AUDIOFLUME_SUPABASE_ADMIN_AUTH_ENABLED !== 'true') {
      return { isAdmin: false, user: { id: owner.userId }, email: undefined }
    }

    try {
      const { data, error } = await supabaseServer.auth.admin.getUserById(owner.supabaseUserId)
      if (error || data.user?.id !== owner.supabaseUserId) {
        return { isAdmin: false, user: { id: owner.userId }, email: undefined }
      }
      const isAdmin = isTrustedSupabaseAdmin(
        process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER,
        process.env.AUDIOFLUME_SUPABASE_ADMIN_AUTH_ENABLED,
        data.user.app_metadata,
      )
      return { isAdmin, user: { id: owner.userId }, email: undefined }
    } catch (error) {
      console.error('Supabase admin authorization failed:', error)
      return { isAdmin: false, user: { id: owner.userId }, email: undefined }
    }
  }

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
