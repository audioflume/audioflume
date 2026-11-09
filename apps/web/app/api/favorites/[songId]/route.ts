import { resolveAccountOwner } from "@/lib/auth/resolveAccountOwner";
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ songId: string }> },
) {
  const account = await resolveAccountOwner();
  const { userId } = account;

  if (!userId) {
    return NextResponse.json(
      { error: account.status === 401 ? "You must be signed in to remove favorites." : account.error },
      { status: account.status },
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
