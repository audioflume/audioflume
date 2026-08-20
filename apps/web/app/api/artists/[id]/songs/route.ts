import { NextResponse } from "next/server";

import { cleanOptionalString } from "@/lib/account";
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
  params: Promise<{ id: string }> | { id: string };
};

type ArtistSongSummary = {
  id: string;
  title: string;
  status: string;
  duration: number;
  bpm: number | null;
  key: string | null;
  created_at: string;
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

async function cleanupUploadedFiles(keys: string[]) {
  try {
    await deleteFilesFromR2([...new Set(keys.filter(Boolean))]);
  } catch (error) {
    console.error("Failed to clean up artist song upload files:", error);
  }
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "catalog:view");

    const { data: links, error: linksError } = await supabaseServer
      .from("song_artists")
      .select("song_id")
      .eq("artist_id", id)
      .eq("role", "primary");

    if (linksError) throw linksError;

    const songIds = (links ?? [])
      .map((link) => link.song_id)
      .filter((songId): songId is string => typeof songId === "string");

    if (songIds.length === 0) {
      return NextResponse.json({ songs: [] });
    }

    const { data: songs, error: songsError } = await supabaseServer
      .from("songs")
      .select("id, title, status, duration, bpm, key, created_at")
      .in("id", songIds)
      .order("created_at", { ascending: false });

    if (songsError) throw songsError;

    return NextResponse.json({
      songs: (songs ?? []) as ArtistSongSummary[],
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Failed to load artist songs:", error);
    return NextResponse.json(
      { error: "Failed to load artist songs" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  let uploadedKeys: string[] = [];

  try {
    const { id } = await context.params;
    await requireArtistPermission(id, "catalog:upload");

    const { data: artist, error: artistError } = await supabaseServer
      .from("artists")
      .select("id, name, status")
      .eq("id", id)
      .maybeSingle();

    if (artistError) throw artistError;
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }

    if (artist.status !== "approved") {
      return NextResponse.json(
        { error: "Artist profile must be approved before uploading music" },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const stemFiles = formData
      .getAll("stems")
      .filter(
        (entry): entry is File => entry instanceof File && entry.size > 0,
      );
    const title = cleanOptionalString(formData.get("title"), 160);
    const waveformPeaks = cleanWaveformPeaks(formData.get("waveformPeaks"));
    const duration = cleanDuration(formData.get("duration"));
    const releaseId = cleanOptionalString(formData.get("releaseId"), 80);

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    if (!title) {
      return NextResponse.json({ error: "Track title is required" }, { status: 400 });
    }

    if (!file.type.startsWith("audio/")) {
      return NextResponse.json(
        { error: "File must be an audio file" },
        { status: 400 },
      );
    }

    if (stemFiles.some((stemFile) => !stemFile.type.startsWith("audio/"))) {
      return NextResponse.json(
        { error: "Stem files must be audio files" },
        { status: 400 },
      );
    }

    let releaseCoverUrl: string | null = null;
    let releaseTrackNumber: number | null = null;

    if (releaseId) {
      await requireArtistPermission(id, "release:manage");

      const { data: releaseLink, error: releaseLinkError } = await supabaseServer
        .from("artist_release_artists")
        .select("release_id")
        .eq("release_id", releaseId)
        .eq("artist_id", id)
        .eq("role", "primary")
        .maybeSingle();

      if (releaseLinkError) throw releaseLinkError;
      if (!releaseLink) {
        return NextResponse.json({ error: "Release not found" }, { status: 404 });
      }

      const { data: release, error: releaseError } = await supabaseServer
        .from("artist_releases")
        .select("id, cover_image_url, release_type")
        .eq("id", releaseId)
        .maybeSingle();

      if (releaseError) throw releaseError;
      if (!release) {
        return NextResponse.json({ error: "Release not found" }, { status: 404 });
      }

      if (!release.cover_image_url) {
        return NextResponse.json(
          { error: "The selected release does not have artwork" },
          { status: 400 },
        );
      }

      releaseCoverUrl = release.cover_image_url;

      const { data: lastTrack, error: lastTrackError } = await supabaseServer
        .from("artist_release_songs")
        .select("track_number")
        .eq("release_id", releaseId)
        .eq("disc_number", 1)
        .order("track_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastTrackError) throw lastTrackError;
      if (release.release_type === "single" && lastTrack) {
        return NextResponse.json(
          { error: "The selected single already has a track" },
          { status: 409 },
        );
      }
      releaseTrackNumber = Number(lastTrack?.track_number ?? 0) + 1;
    }

    const artistSlug = slugify(artist.name);
    const titleSlug = slugify(title);
    const timestamp = Date.now();
    const fileName = safeFileName(file.name);
    const versionedBaseKey = `${artistSlug}/${titleSlug}/${timestamp}`;
    const masterKey = `${versionedBaseKey}/audio/${fileName}`;

    const audioUrl = await uploadFileToR2({
      file,
      key: masterKey,
    });
    uploadedKeys = [masterKey];

    const streamingAssets = await processAudioForStreaming({
      file,
      baseKey: versionedBaseKey,
    });
    uploadedKeys.push(
      streamingAssets.playbackKey,
      ...streamingAssets.hlsAssetKeys,
    );

    const stemUrls: string[] = [];
    for (const stemFile of stemFiles) {
      const stemKey = `${artistSlug}/${titleSlug}/stems/${Date.now()}-${safeFileName(stemFile.name)}`;
      const stemUrl = await uploadFileToR2({
        file: stemFile,
        key: stemKey,
      });
      uploadedKeys.push(stemKey);
      stemUrls.push(stemUrl);
    }

    const { data: song, error: songError } = await supabaseServer
      .from("songs")
      .insert({
        title,
        artist: artist.name,
        audio_url: audioUrl,
        playback_url: streamingAssets.playbackUrl,
        hls_url: streamingAssets.hlsUrl,
        cover_url: releaseCoverUrl,
        stems: stemUrls.length > 0 ? stemUrls.join("\n") : null,
        waveform_peaks: waveformPeaks,
        duration,
        size_bytes: file.size,
        status: "draft",
      })
      .select("id, title, status, duration, bpm, key, created_at")
      .single();

    if (songError) {
      await cleanupUploadedFiles(uploadedKeys);
      throw songError;
    }

    const { error: linkError } = await supabaseServer
      .from("song_artists")
      .insert({
        song_id: song.id,
        artist_id: id,
        role: "primary",
        position: 0,
      });

    if (linkError) {
      await supabaseServer.from("songs").delete().eq("id", song.id);
      await cleanupUploadedFiles(uploadedKeys);
      throw linkError;
    }

    if (releaseId && releaseTrackNumber) {
      const { error: releaseSongError } = await supabaseServer
        .from("artist_release_songs")
        .insert({
          release_id: releaseId,
          song_id: song.id,
          disc_number: 1,
          track_number: releaseTrackNumber,
        });

      if (releaseSongError) {
        await supabaseServer.from("songs").delete().eq("id", song.id);
        await cleanupUploadedFiles(uploadedKeys);
        throw releaseSongError;
      }
    }

    return NextResponse.json(
      { song: song as ArtistSongSummary },
      { status: 201 },
    );
  } catch (error) {
    if (uploadedKeys.length > 0) {
      await cleanupUploadedFiles(uploadedKeys);
    }

    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Artist song upload failed:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to upload artist song",
      },
      { status: 500 },
    );
  }
}