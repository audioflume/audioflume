import { NextResponse } from "next/server";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { processAudioForStreaming } from "@/lib/audioProcessing";
import { deleteFilesFromR2, uploadFileToR2 } from "@/lib/r2";
import { supabaseServer } from "@/lib/supabaseServer";

export const runtime = "nodejs";
export const maxDuration = 300;

type RouteContext = {
  params:
    | Promise<{ id: string; songId: string }>
    | { id: string; songId: string };
};

function slugify(value: string) {
  const cleanValue = value
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/['"]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return cleanValue || "untitled";
}

function safeFileName(name: string) {
  const extension = name.includes(".") ? name.split(".").pop() : "";
  const baseName = name.replace(/\.[^/.]+$/, "");
  const cleanBaseName = slugify(baseName);

  return extension
    ? `${cleanBaseName}.${extension.toLowerCase()}`
    : cleanBaseName;
}

function cleanDuration(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return 0;
  const duration = Number(value);
  if (!Number.isFinite(duration) || duration < 0) return 0;
  return duration;
}

function cleanWaveformPeaks(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !value.trim()) return "[]";

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return "[]";

    const peaks = parsed
      .slice(0, 3000)
      .map((peak) => Number(peak))
      .filter((peak) => Number.isFinite(peak))
      .map((peak) => Math.max(-1, Math.min(1, peak)));

    return JSON.stringify(peaks);
  } catch {
    return "[]";
  }
}

function getR2KeyFromUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}

async function requirePrimarySong(artistId: string, songId: string) {
  const { data, error } = await supabaseServer
    .from("song_artists")
    .select("song_id")
    .eq("artist_id", artistId)
    .eq("song_id", songId)
    .eq("role", "primary")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function isInPublishedRelease(songId: string) {
  const { data: releaseLinks, error: releaseLinksError } = await supabaseServer
    .from("artist_release_songs")
    .select("release_id")
    .eq("song_id", songId);

  if (releaseLinksError) throw releaseLinksError;

  const releaseIds = (releaseLinks ?? [])
    .map((link) => link.release_id)
    .filter((releaseId): releaseId is string => typeof releaseId === "string");

  if (releaseIds.length === 0) return false;

  const { data: publishedRelease, error: releaseError } = await supabaseServer
    .from("artist_releases")
    .select("id")
    .in("id", releaseIds)
    .eq("status", "published")
    .limit(1)
    .maybeSingle();

  if (releaseError) throw releaseError;
  return Boolean(publishedRelease);
}

async function cleanupUploadedFiles(keys: string[]) {
  try {
    await deleteFilesFromR2([...new Set(keys.filter(Boolean))]);
  } catch (error) {
    console.error("Failed to clean up replacement audio files:", error);
  }
}

export async function POST(request: Request, context: RouteContext) {
  let uploadedKeys: string[] = [];

  try {
    const { id, songId } = await context.params;
    await requireArtistPermission(id, "catalog:edit");

    if (!(await requirePrimarySong(id, songId))) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const [artistResult, songResult] = await Promise.all([
      supabaseServer
        .from("artists")
        .select("id, name, status")
        .eq("id", id)
        .maybeSingle(),
      supabaseServer
        .from("songs")
        .select(
          "id, title, status, audio_url, playback_url, hls_url, duration, bpm, key, created_at",
        )
        .eq("id", songId)
        .maybeSingle(),
    ]);

    if (artistResult.error) throw artistResult.error;
    if (songResult.error) throw songResult.error;
    if (!artistResult.data) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }
    if (artistResult.data.status !== "approved") {
      return NextResponse.json(
        { error: "Artist profile must be approved before replacing track audio" },
        { status: 403 },
      );
    }
    if (!songResult.data) {
      return NextResponse.json({ error: "Track not found" }, { status: 404 });
    }

    const currentSong = songResult.data;
    if (currentSong.status === "processing" || currentSong.status === "submitted") {
      return NextResponse.json(
        { error: "Audio cannot be replaced while this track is processing or under review" },
        { status: 409 },
      );
    }
    if (currentSong.status === "archived") {
      return NextResponse.json(
        { error: "Restore this track before replacing its audio" },
        { status: 409 },
      );
    }
    if (await isInPublishedRelease(songId)) {
      return NextResponse.json(
        { error: "Unpublish releases containing this track before replacing its audio" },
        { status: 409 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const waveformPeaks = cleanWaveformPeaks(formData.get("waveformPeaks"));
    const duration = cleanDuration(formData.get("duration"));

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "File must be an audio file" },
        { status: 400 },
      );
    }

    const artistSlug = slugify(artistResult.data.name);
    const titleSlug = slugify(currentSong.title);
    const timestamp = Date.now();
    const fileName = safeFileName(file.name);
    const versionedBaseKey = `${artistSlug}/${titleSlug}/${timestamp}`;
    const masterKey = `${versionedBaseKey}/audio/${fileName}`;

    const audioUrl = await uploadFileToR2({ file, key: masterKey });
    uploadedKeys = [masterKey];

    const streamingAssets = await processAudioForStreaming({
      file,
      baseKey: versionedBaseKey,
    });
    uploadedKeys.push(
      streamingAssets.playbackKey,
      ...streamingAssets.hlsAssetKeys,
    );

    const resetToDraft =
      currentSong.status === "published" ||
      currentSong.status === "approved" ||
      currentSong.status === "rejected";
    const nextStatus = resetToDraft ? "draft" : currentSong.status;

    const { data: updatedSong, error: updateError } = await supabaseServer
      .from("songs")
      .update({
        audio_url: audioUrl,
        playback_url: streamingAssets.playbackUrl,
        hls_url: streamingAssets.hlsUrl,
        waveform_peaks: waveformPeaks,
        duration,
        size_bytes: file.size,
        status: nextStatus,
        archived_at: null,
        archived_from_status: null,
      })
      .eq("id", songId)
      .select("id, title, status, duration, bpm, key, created_at")
      .single();

    if (updateError) {
      await cleanupUploadedFiles(uploadedKeys);
      throw updateError;
    }

    const oldKeys = [
      getR2KeyFromUrl(currentSong.audio_url),
      getR2KeyFromUrl(currentSong.playback_url),
      getR2KeyFromUrl(currentSong.hls_url),
    ].filter((key): key is string => Boolean(key));

    if (oldKeys.length > 0) {
      try {
        await deleteFilesFromR2(oldKeys);
      } catch (error) {
        console.error("Failed to remove previous artist audio assets:", error);
      }
    }

    return NextResponse.json({
      song: updatedSong,
      reset_for_review: resetToDraft,
    });
  } catch (error) {
    if (uploadedKeys.length > 0) {
      await cleanupUploadedFiles(uploadedKeys);
    }

    if (error instanceof ArtistAccessError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Artist audio replacement failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to replace track audio",
      },
      { status: 500 },
    );
  }
}
