import { getSongs } from "@/lib/songs";
import { NextResponse } from "next/server";

export const revalidate = 3600;

function isAdminSongsRequest(req: Request) {
  const requestUrl = new URL(req.url);

  if (requestUrl.searchParams.get("order") === "oldest") return true;

  const referer = req.headers.get("referer") || "";

  try {
    return new URL(referer).pathname.startsWith("/admin");
  } catch {
    return referer.includes("/admin");
  }
}

export async function GET(req: Request) {
  try {
    const songs = await getSongs();
    const adminSongsRequest = isAdminSongsRequest(req);
    const responseSongs = adminSongsRequest ? [...songs].reverse() : songs;

    return NextResponse.json(responseSongs, {
      headers: adminSongsRequest
        ? {
            "Cache-Control": "private, no-store",
            Vary: "Referer",
          }
        : {
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
