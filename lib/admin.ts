import { currentUser } from '@clerk/nextjs/server'
import { ADMIN_EMAILS } from '@/lib/adminEmails'

export async function requireAdmin() {
  const user = await currentUser()
  const email = user?.primaryEmailAddress?.emailAddress

  if (!email || !ADMIN_EMAILS.includes(email)) {
    return {
      isAdmin: false,
      user,
      email,
    }
  }

  return {
    isAdmin: true,
    user,
    email,
  }
}