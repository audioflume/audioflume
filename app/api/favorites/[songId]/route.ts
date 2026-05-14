import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ songId: string }> },
) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json(
      { error: "You must be signed in to remove favorites." },
      { status: 401 },
    );
  }

  const { songId } = await params;

  if (!songId) {
    return NextResponse.json({ error: "Missing songId." }, { status: 400 });
  }

  const { error } = await supabaseServer
    .from("favorites")
    .delete()
    .eq("clerk_user_id", userId)
    .eq("song_id", decodeURIComponent(songId));

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

  return NextResponse.json({ ok: true });
}
