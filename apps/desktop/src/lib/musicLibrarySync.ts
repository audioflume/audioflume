import { exists, mkdir, writeFile } from "@tauri-apps/plugin-fs";
import { fetch as tauriFetch } from "@tauri-apps/plugin-http";
import type { DesktopSong } from "./desktopSongs";

export const MUSIC_LIBRARY_SYNC_FOLDER_NAME = "Music Library Sync";

function sanitizeFileName(value: string) {
  return value
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getExtensionFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const pathname = parsedUrl.pathname;
    const extension = pathname.match(/\.([a-z0-9]{2,5})$/i)?.[1];

    return extension ? extension.toLowerCase() : null;
  } catch {
    return null;
  }
}

function getSongDownloadUrl(song: DesktopSong) {
  return song.audioUrl || song.playbackUrl || song.hlsUrl;
}

export function getMusicLibrarySyncFolderPath(syncFolder: string) {
  return `${syncFolder}/${MUSIC_LIBRARY_SYNC_FOLDER_NAME}`;
}

export function getMusicLibrarySyncedSongPath({
  song,
  syncFolder,
}: {
  song: DesktopSong;
  syncFolder: string;
}) {
  const title = sanitizeFileName(song.title) || "Untitled Song";
  const artist = sanitizeFileName(song.artist) || "Unknown Artist";
  const extension = getExtensionFromUrl(getSongDownloadUrl(song)) ?? "mp3";

  return `${getMusicLibrarySyncFolderPath(syncFolder)}/${artist} - ${title}.${extension}`;
}

export async function syncSongToMusicLibraryFolder({
  song,
  syncFolder,
}: {
  song: DesktopSong;
  syncFolder: string;
}) {
  const downloadUrl = getSongDownloadUrl(song);

  if (!downloadUrl) {
    throw new Error("This song does not have a downloadable audio URL.");
  }

  const librarySyncFolder = getMusicLibrarySyncFolderPath(syncFolder);
  const localPath = getMusicLibrarySyncedSongPath({ song, syncFolder });

  await mkdir(librarySyncFolder, { recursive: true });

  if (await exists(localPath)) {
    return localPath;
  }

  const response = await tauriFetch(downloadUrl);

  if (!response.ok) {
    throw new Error(`Song sync failed: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  const data = new Uint8Array(await response.arrayBuffer());

  if (data.byteLength < 1024 && contentType.includes("text/html")) {
    throw new Error("Song sync returned HTML instead of audio.");
  }

  await writeFile(localPath, data);

  return localPath;
}
