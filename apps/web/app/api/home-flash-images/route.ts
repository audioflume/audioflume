import { NextResponse } from "next/server";
import { getHomeFlashImages } from "@/lib/homeFlashImages";

export async function GET() {
  const images = await getHomeFlashImages();
  return NextResponse.json(
    { images },
    { headers: { "Cache-Control": "public, max-age=300" } },
  );
}
