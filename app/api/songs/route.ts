import { getSongs } from "@/lib/songs";
import { NextResponse } from "next/server";

export const revalidate = 3600;

export async function GET() {
  try {
    const songs = await getSongs();

    return NextResponse.json(songs, {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      },
    });
  } catch (error) {
    console.error("Failed to load songs:", error);

    return NextResponse.json(
      { error: "Failed to load songs" },
      { status: 500 },
    );
  }
}
