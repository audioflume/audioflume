import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const { userId } = await auth();

  if (!userId) {
    // Intentionally returns 200 with empty array rather than 401,
    // so the UI can render gracefully for unauthenticated users
    // without needing to handle an error state.
    return NextResponse.json({ favorites: [] });
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
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to favorite songs." },
      { status: 401 },
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
