import { getSongs } from "@/lib/songs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const songs = await getSongs();

    return NextResponse.json(songs);
  } catch (error) {
    console.error("Failed to load songs:", error);

    return NextResponse.json(
      { error: "Failed to load songs" },
      { status: 500 },
    );
  }
}
