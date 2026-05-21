import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  cleanOptionalString,
  ensureUserProfile,
  getPrimaryEmail,
} from "@/lib/account";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const user = await currentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const profile = await ensureUserProfile(user.id, user);

    return NextResponse.json({
      profile,
      identity: {
        email: getPrimaryEmail(user),
        image_url: user.imageUrl ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to load account profile:", error);
    return NextResponse.json(
      { error: "Failed to load account profile" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const user = await currentUser();

  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  const updates = {
    first_name: cleanOptionalString(payload.first_name, 80),
    last_name: cleanOptionalString(payload.last_name, 80),
    display_name: cleanOptionalString(payload.display_name, 160),
    company_name: cleanOptionalString(payload.company_name, 160),
    primary_use: cleanOptionalString(payload.primary_use, 160),
    avatar_url: cleanOptionalString(payload.avatar_url, 500) ?? user.imageUrl ?? null,
  };

  if (!updates.display_name) {
    return NextResponse.json(
      { error: "Display name is required" },
      { status: 400 },
    );
  }

  try {
    await ensureUserProfile(user.id, user);

    const { data, error } = await supabaseServer
      .from("user_profiles")
      .upsert(
        {
          clerk_user_id: user.id,
          ...updates,
        },
        { onConflict: "clerk_user_id" },
      )
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({
      profile: data,
      identity: {
        email: getPrimaryEmail(user),
        image_url: user.imageUrl ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to update account profile:", error);
    return NextResponse.json(
      { error: "Failed to update account profile" },
      { status: 500 },
    );
  }
}
