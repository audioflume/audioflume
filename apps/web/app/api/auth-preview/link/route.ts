import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { supabaseServer } from "@/lib/supabaseServer";
import { getLinkedLegacyUserId } from "@/lib/supabaseIdentity";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStore(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function verifiedClerkEmail(user: Awaited<ReturnType<typeof currentUser>>) {
  const primary = user?.primaryEmailAddress;
  return primary?.verification?.status === "verified"
    ? primary.emailAddress.trim().toLowerCase()
    : null;
}

// Read-only lookup for a signed-in Supabase user. Never returns a legacy ID.
// It does not establish an Audioflume application session or grant data access.
export async function GET(request: Request) {
  const authorization = request.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length).trim()
    : "";

  if (!token) {
    return noStore({ error: "Supabase sign-in is required." }, 401);
  }

  try {
    const { data: { user }, error } = await supabaseServer.auth.getUser(token);
    if (error || !user) {
      return noStore({ error: "Supabase session could not be verified." }, 401);
    }

    const legacyId = await getLinkedLegacyUserId(token);
    return noStore({ linked: legacyId !== null });
  } catch (error) {
    console.error("Could not read Supabase account link status:", error);
    return noStore({ error: "Account link status is temporarily unavailable." }, 500);
  }
}

// Explicit, opt-in transition only. Requires independent proof of BOTH identities.
// The Supabase token is never stored; authorization comes from server-side verification.
export async function POST(request: Request) {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return noStore({ error: "Sign in to your existing Audioflume account with Clerk first." }, 401);
  }

  const clerkUser = await currentUser();
  if (!clerkUser || clerkUser.id !== clerkUserId) {
    return noStore({ error: "Could not verify the existing Audioflume account." }, 401);
  }

  const email = verifiedClerkEmail(clerkUser);
  if (!email) {
    return noStore({ error: "Your existing account needs a verified primary email before linking." }, 403);
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return noStore({ error: "Supabase sign-in is required." }, 401);
  }

  const accessToken = authorization.slice("Bearer ".length).trim();
  if (!accessToken) {
    return noStore({ error: "Supabase sign-in is required." }, 401);
  }

  const { data: sessionData, error: sessionError } = await supabaseServer.auth.getUser(accessToken);
  const supabaseUser = sessionData.user;

  if (sessionError || !supabaseUser) {
    return noStore({ error: "Supabase session could not be verified. Sign in again." }, 401);
  }

  if (
    !supabaseUser.email_confirmed_at ||
    !supabaseUser.email ||
    supabaseUser.email.trim().toLowerCase() !== email
  ) {
    return noStore({ error: "Both accounts must have the same verified email to link safely." }, 403);
  }

  try {
    const { data: existingForSupabase, error: lookupError } = await supabaseServer
      .from("auth_identity_links")
      .select("clerk_user_id")
      .eq("supabase_user_id", supabaseUser.id)
      .maybeSingle();

    if (lookupError) throw lookupError;

    if (existingForSupabase) {
      if (existingForSupabase.clerk_user_id !== clerkUserId) {
        return noStore({ error: "This Supabase account is already linked to another Audioflume account." }, 409);
      }
      return noStore({ linked: true, alreadyLinked: true });
    }

    const { data: existingForClerk, error: clerkLookupError } = await supabaseServer
      .from("auth_identity_links")
      .select("supabase_user_id")
      .eq("clerk_user_id", clerkUserId)
      .maybeSingle();

    if (clerkLookupError) throw clerkLookupError;

    if (existingForClerk) {
      return noStore({ error: "This Audioflume account is already linked to a different Supabase account." }, 409);
    }

    const { error: insertError } = await supabaseServer
      .from("auth_identity_links")
      .insert({
        supabase_user_id: supabaseUser.id,
        clerk_user_id: clerkUserId,
      });

    if (insertError?.code === "23505") {
      return noStore({ error: "One of these accounts was linked elsewhere. Refresh and try again." }, 409);
    }
    if (insertError) throw insertError;

    return noStore({ linked: true, alreadyLinked: false });
  } catch (error) {
    console.error("Could not link authenticated identities:", error);
    return noStore({ error: "Account linking is temporarily unavailable." }, 500);
  }
}
