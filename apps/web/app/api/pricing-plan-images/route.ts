import { NextResponse } from "next/server";
import { getHomeFlashImages } from "@/lib/homeFlashImages";

export async function GET() {
  const images = (await getHomeFlashImages()).filter(
    (image) => !image.includes("andrey-strizhkov-sehwu2FbcHg-unsplash-web.jpg"),
  );
  return NextResponse.json({
    images: [
      images[0] ?? "https://images.filmwave.io/images/home/kyle-loftus-FtQE89f3EXA-unsplash.jpg",
      images[1] ?? images[0] ?? "https://images.filmwave.io/images/home/kyle-loftus-FtQE89f3EXA-unsplash.jpg",
      "https://images.filmwave.io/images/home/thomas-kinto-qYqbehR-wSI-unsplash.jpg",
    ],
  });
}
