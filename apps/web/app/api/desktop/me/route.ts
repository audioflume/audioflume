import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getDesktopUserIdFromRequest } from "@/lib/desktopAuth";
import { selectDesktopAuthProvider } from "@/lib/auth/selectDesktopAuthProvider";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const userId = getDesktopUserIdFromRequest(req);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (selectDesktopAuthProvider(
      process.env.AUDIOFLUME_DESKTOP_AUTH_PROVIDER,
      process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER,
    ) === "supabase") {
      // Desktop bearer carries the independently verified legacy owner ID.
      // Never look up a concurrent Clerk browser session for this identity.
      const { data: profile, error } = await supabaseServer
        .from("user_profiles")
        .select("clerk_user_id, display_name, first_name, last_name, avatar_url")
        .eq("clerk_user_id", userId)
        .maybeSingle();

      if (error) throw error;
      if (!profile) {
        return NextResponse.json({ error: "Account profile not found" }, { status: 404 });
      }

      return NextResponse.json(
        { user: {
          id: userId,
          name: profile.display_name ||
            [profile.first_name, profile.last_name].filter(Boolean).join(" ") ||
            "Audioflume user",
          email: null,
          imageUrl: profile.avatar_url ?? null,
        } },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find(
      (email) => email.id === user.primaryEmailAddressId,
    );

    return NextResponse.json(
      {
        user: {
          id: user.id,
          name:
            [user.firstName, user.lastName].filter(Boolean).join(" ") ||
            user.username ||
            primaryEmail?.emailAddress ||
            "Audioflume user",
          email: primaryEmail?.emailAddress ?? null,
          imageUrl: user.imageUrl ?? null,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("Desktop account fetch error:", error);

    return NextResponse.json(
      { error: "Could not load desktop account" },
      { status: 500 },
    );
  }
}
