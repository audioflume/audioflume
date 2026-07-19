import { randomUUID } from "node:crypto";
import { uploadFileToR2 } from "@/lib/r2";

const MAX_PLAYLIST_COVER_BYTES = 10 * 1024 * 1024;
const DATA_IMAGE_PATTERN = /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/is;

function getImageExtension(contentType: string) {
  switch (contentType.toLowerCase()) {
    case "image/jpeg":
    case "image/jpg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "image/avif":
      return "avif";
    default:
      return "img";
  }
}

function toArrayBuffer(buffer: Buffer) {
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength,
  ) as ArrayBuffer;
}

export async function storePlaylistCover(
  coverValue: unknown,
  userId: string,
): Promise<string | null> {
  if (typeof coverValue !== "string") return null;

  const cleanValue = coverValue.trim();
  if (!cleanValue) return null;
  if (!cleanValue.startsWith("data:")) return cleanValue;

  const match = cleanValue.match(DATA_IMAGE_PATTERN);

  if (!match) {
    throw new Error("Invalid playlist cover image data");
  }

  const contentType = match[1].toLowerCase();
  const fileBuffer = Buffer.from(match[2], "base64");

  if (!contentType.startsWith("image/")) {
    throw new Error("Playlist cover must be an image");
  }

  if (!fileBuffer.length) {
    throw new Error("Playlist cover image is empty");
  }

  if (fileBuffer.length > MAX_PLAYLIST_COVER_BYTES) {
    throw new Error("Playlist cover image must be smaller than 10 MB");
  }

  const extension = getImageExtension(contentType);
  const safeUserId = userId.replace(/[^a-zA-Z0-9_-]/g, "-");
  const key = `images/playlists/${safeUserId}/${Date.now()}-${randomUUID()}.${extension}`;

  return uploadFileToR2({
    file: {
      name: `playlist-cover.${extension}`,
      type: contentType,
      arrayBuffer: async () => toArrayBuffer(fileBuffer),
    },
    key,
  });
}
