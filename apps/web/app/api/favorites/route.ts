import { resolveAccountOwner } from "@/lib/auth/resolveAccountOwner";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const account = await resolveAccountOwner();
  const { userId } = account;

  if (!userId) {
    // Preserve the existing empty guest response; do not conceal an unlinked
    // Supabase identity or backend error behind an empty favorites array.
    if (account.status === 401) {
      return NextResponse.json({ favorites: [] });
    }
    return NextResponse.json({ error: account.error }, { status: account.status });
  }

  const { data, error } = await supabaseServer
    .from("favorites")
    .select("song_id, created_at")
    .eq("clerk_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    favorites: data ?? [],
  });
}

export async function POST(request: Request) {
  const account = await resolveAccountOwner();
  const { userId } = account;

  if (!userId) {
    return NextResponse.json(
      { error: account.status === 401 ? "You must be signed in to favorite songs." : account.error },
      { status: account.status },
    );
  }

  const body = await request.json().catch(() => null);
  const songId = typeof body?.song_id === "string" ? body.song_id : "";

  if (!songId) {
    return NextResponse.json({ error: "Missing song_id." }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("favorites")
    .upsert(
      {
        clerk_user_id: userId,
        song_id: songId,
      },
      {
        onConflict: "clerk_user_id,song_id",
      },
    )
    .select("id, created_at, clerk_user_id, song_id")
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      },
      { status: 500 },
    );
  }

  return NextResponse.json(data);
}
