import { ListObjectsV2Command } from "@aws-sdk/client-s3";

import { r2Client } from "@/lib/r2";

import HomePageContent from "./HomePageContent";
import "./home-page.css";

const DEFAULT_HOME_FLASH_IMAGE =
  "https://images.filmwave.io/images/home/andrey-strizhkov-sehwu2FbcHg-unsplash.jpg";
const HOME_FLASH_IMAGE_EXTENSIONS = /\.(avif|jpe?g|png|webp)$/i;

async function listHomeFlashImagesForPrefix(bucket: string, prefix: string) {
  const result = await r2Client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    }),
  );

  return (result.Contents ?? [])
    .map((object) => object.Key)
    .filter(
      (key): key is string =>
        Boolean(key) && HOME_FLASH_IMAGE_EXTENSIONS.test(key as string),
    );
}

async function getHomeFlashImages() {
  const bucket =
    process.env.CLOUDFLARE_R2_IMAGES_BUCKET_NAME ||
    process.env.CLOUDFLARE_R2_BUCKET_NAME ||
    "";
  const publicBaseUrl = (
    process.env.CLOUDFLARE_R2_IMAGES_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    ""
  ).replace(/\/$/, "");

  if (!bucket || !publicBaseUrl) return [DEFAULT_HOME_FLASH_IMAGE];

  try {
    let keys = await listHomeFlashImagesForPrefix(bucket, "images/pricing/");
    if (keys.length === 0) {
      keys = await listHomeFlashImagesForPrefix(bucket, "pricing/");
    }

    if (keys.length === 0) return [DEFAULT_HOME_FLASH_IMAGE];

    return keys
      .sort((a, b) => a.localeCompare(b))
      .map(
        (key) =>
          `${publicBaseUrl}/${key
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/")}`,
      );
  } catch (error) {
    console.error("Failed to load homepage flash images from R2:", error);
    return [DEFAULT_HOME_FLASH_IMAGE];
  }
}

export default async function Home() {
  const homeFlashImages = await getHomeFlashImages();

  return <HomePageContent homeFlashImages={homeFlashImages} />;
}
