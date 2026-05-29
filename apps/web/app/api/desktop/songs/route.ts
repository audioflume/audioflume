import { NextResponse } from "next/server";
import { getSongs } from "@/lib/songs";

export async function GET() {
  try {
    const songs = await getSongs();
    return NextResponse.json({ songs });
  } catch (error) {
    console.error("Desktop songs fetch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load desktop song data" },
      { status: 500 },
    );
  }
}
