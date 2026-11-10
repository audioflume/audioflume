import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createSupabaseAccountRequest } from "@/lib/auth/resolveSupabaseAccountRequest";
import { selectAccountAuthProvider } from "@/lib/auth/selectAccountAuthProvider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Server-side linked-owner check for the future website login flow.
 * Only enabled in explicit Supabase mode; returns no user ID or private data.
 */
export async function GET(request: NextRequest) {
  if (selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) !== "supabase") {
    return NextResponse.json(
      { authorized: false, error: "Supabase account login is not enabled." },
      { status: 404, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  const { resolveOwner, respond } = createSupabaseAccountRequest(request);

  try {
    const result = await resolveOwner();
    if (result.status !== 200) {
      return respond({ authorized: false, error: result.error }, result.status);
    }
    return respond({ authorized: true });
  } catch (error) {
    console.error("Supabase account session verification failed:", error);
    return respond({ authorized: false, error: "Account verification unavailable." }, 500);
  }
}
