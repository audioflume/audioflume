import type { NextRequest } from "next/server";
import { createSupabaseAccountRequest } from "@/lib/auth/resolveSupabaseAccountRequest";
import { selectAccountAuthProvider } from "@/lib/auth/selectAccountAuthProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Read-only production-cookie smoke test. This never activates provider
// switching, writes user data or returns legacy owner identifiers.
export async function GET(request: NextRequest) {
  const { resolveOwner, respond } = createSupabaseAccountRequest(request);
  const accountApiProvider = selectAccountAuthProvider(
    process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER,
  );

  try {
    const result = await resolveOwner();
    if (result.status !== 200) {
      return respond({
        authorized: false,
        accountApiProvider,
        error: result.error,
      }, result.status);
    }

    return respond({ authorized: true, accountApiProvider });
  } catch (error) {
    console.error("Production-cookie preview verification failed:", error);
    return respond({
      authorized: false,
      accountApiProvider,
      error: "Session verification temporarily unavailable.",
    }, 500);
  }
}
