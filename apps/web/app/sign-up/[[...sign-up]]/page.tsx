import { SignUp } from '@clerk/nextjs'
import SupabaseAccountAuthForm from "@/components/auth/SupabaseAccountAuthForm";
import { selectAccountAuthProvider } from "@/lib/auth/selectAccountAuthProvider";


export default function SignUpPage() {
  if (selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === "supabase") {
    return <SupabaseAccountAuthForm initialMode="sign-up" next="/discover" />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp />
    </div>
  )
}