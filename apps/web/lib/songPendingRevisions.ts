import { supabaseServer } from "@/lib/supabaseServer";

export type SongPendingRevisionStatus = "submitted" | "changes_requested";

export type SongPendingRevision = {
  song_id: string;
  status: SongPendingRevisionStatus;
  metadata: Record<string, unknown> | null;
  credits: unknown[] | null;
  rights: Record<string, unknown> | null;
  rights_holders: unknown[] | null;
  audio_url: string | null;
  playback_url: string | null;
  hls_url: string | null;
  waveform_peaks: string | null;
  duration: number | string | null;
  size_bytes: number | string | null;
  submitted_by_clerk_user_id: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string;
};

export function songStatusUsesPendingRevision(status: string) {
  return status === "published" || status === "approved";
}

export async function getSongPendingRevision(songId: string) {
  const { data, error } = await supabaseServer
    .from("song_pending_revisions")
    .select(
      "song_id, status, metadata, credits, rights, rights_holders, audio_url, playback_url, hls_url, waveform_peaks, duration, size_bytes, submitted_by_clerk_user_id, review_notes, created_at, updated_at",
    )
    .eq("song_id", songId)
    .maybeSingle();

  if (error) throw error;
  return (data as SongPendingRevision | null) ?? null;
}

export function mergeSongPendingRevision<
  T extends Record<string, unknown>,
>(liveSong: T, revision: SongPendingRevision | null) {
  if (!revision) return liveSong;

  const metadata =
    revision.metadata && typeof revision.metadata === "object"
      ? revision.metadata
      : {};

  return {
    ...liveSong,
    ...metadata,
    ...(revision.audio_url
      ? {
          audio_url: revision.audio_url,
          playback_url: revision.playback_url,
          hls_url: revision.hls_url,
          waveform_peaks: revision.waveform_peaks,
          duration: revision.duration,
          size_bytes: revision.size_bytes,
        }
      : {}),
  };
}

export async function upsertSongMetadataRevision({
  songId,
  userId,
  metadata,
  credits,
  rights,
  rightsHolders,
}: {
  songId: string;
  userId: string | null;
  metadata: Record<string, unknown>;
  credits: unknown[];
  rights: Record<string, unknown> | null;
  rightsHolders: unknown[] | null;
}) {
  const existingRevision = await getSongPendingRevision(songId);

  const payload = {
    song_id: songId,
    status: "submitted" as const,
    metadata: {
      ...(existingRevision?.metadata ?? {}),
      ...metadata,
    },
    credits,
    rights,
    rights_holders: rightsHolders,
    audio_url: existingRevision?.audio_url ?? null,
    playback_url: existingRevision?.playback_url ?? null,
    hls_url: existingRevision?.hls_url ?? null,
    waveform_peaks: existingRevision?.waveform_peaks ?? null,
    duration: existingRevision?.duration ?? null,
    size_bytes: existingRevision?.size_bytes ?? null,
    submitted_by_clerk_user_id: userId,
    review_notes: null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServer
    .from("song_pending_revisions")
    .upsert(payload, { onConflict: "song_id" })
    .select(
      "song_id, status, metadata, credits, rights, rights_holders, audio_url, playback_url, hls_url, waveform_peaks, duration, size_bytes, submitted_by_clerk_user_id, review_notes, created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return data as SongPendingRevision;
}

export async function upsertSongFileMetadataRevision({
  songId,
  userId,
  metadataPatch,
}: {
  songId: string;
  userId: string | null;
  metadataPatch: Record<string, unknown>;
}) {
  const existingRevision = await getSongPendingRevision(songId);

  const payload = {
    song_id: songId,
    status: "submitted" as const,
    metadata: {
      ...(existingRevision?.metadata ?? {}),
      ...metadataPatch,
    },
    credits: existingRevision?.credits ?? null,
    rights: existingRevision?.rights ?? null,
    rights_holders: existingRevision?.rights_holders ?? null,
    audio_url: existingRevision?.audio_url ?? null,
    playback_url: existingRevision?.playback_url ?? null,
    hls_url: existingRevision?.hls_url ?? null,
    waveform_peaks: existingRevision?.waveform_peaks ?? null,
    duration: existingRevision?.duration ?? null,
    size_bytes: existingRevision?.size_bytes ?? null,
    submitted_by_clerk_user_id: userId,
    review_notes: null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServer
    .from("song_pending_revisions")
    .upsert(payload, { onConflict: "song_id" })
    .select(
      "song_id, status, metadata, credits, rights, rights_holders, audio_url, playback_url, hls_url, waveform_peaks, duration, size_bytes, submitted_by_clerk_user_id, review_notes, created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return data as SongPendingRevision;
}

export async function upsertSongAudioRevision({
  songId,
  userId,
  audioUrl,
  playbackUrl,
  hlsUrl,
  waveformPeaks,
  duration,
  sizeBytes,
}: {
  songId: string;
  userId: string | null;
  audioUrl: string;
  playbackUrl: string;
  hlsUrl: string;
  waveformPeaks: string;
  duration: number;
  sizeBytes: number;
}) {
  const existingRevision = await getSongPendingRevision(songId);

  const payload = {
    song_id: songId,
    status: "submitted" as const,
    metadata: existingRevision?.metadata ?? null,
    credits: existingRevision?.credits ?? null,
    rights: existingRevision?.rights ?? null,
    rights_holders: existingRevision?.rights_holders ?? null,
    audio_url: audioUrl,
    playback_url: playbackUrl,
    hls_url: hlsUrl,
    waveform_peaks: waveformPeaks,
    duration,
    size_bytes: sizeBytes,
    submitted_by_clerk_user_id: userId,
    review_notes: null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseServer
    .from("song_pending_revisions")
    .upsert(payload, { onConflict: "song_id" })
    .select(
      "song_id, status, metadata, credits, rights, rights_holders, audio_url, playback_url, hls_url, waveform_peaks, duration, size_bytes, submitted_by_clerk_user_id, review_notes, created_at, updated_at",
    )
    .single();

  if (error) throw error;
  return {
    revision: data as SongPendingRevision,
    previousAudioUrl: existingRevision?.audio_url ?? null,
    previousPlaybackUrl: existingRevision?.playback_url ?? null,
    previousHlsUrl: existingRevision?.hls_url ?? null,
  };
}

export async function setSongPendingRevisionChangesRequested(
  songId: string,
  notes: string,
) {
  const { data, error } = await supabaseServer
    .from("song_pending_revisions")
    .update({
      status: "changes_requested",
      review_notes: notes,
      updated_at: new Date().toISOString(),
    })
    .eq("song_id", songId)
    .eq("status", "submitted")
    .select(
      "song_id, status, metadata, credits, rights, rights_holders, audio_url, playback_url, hls_url, waveform_peaks, duration, size_bytes, submitted_by_clerk_user_id, review_notes, created_at, updated_at",
    )
    .maybeSingle();

  if (error) throw error;
  return (data as SongPendingRevision | null) ?? null;
}

export async function deleteSongPendingRevision(songId: string) {
  const revision = await getSongPendingRevision(songId);
  if (!revision) return null;

  const { error } = await supabaseServer
    .from("song_pending_revisions")
    .delete()
    .eq("song_id", songId);

  if (error) throw error;
  return revision;
}

export async function applySongPendingRevision(songId: string) {
  const { data, error } = await supabaseServer.rpc("apply_song_pending_revision", {
    p_song_id: songId,
  });

  if (error) throw error;

  const result = Array.isArray(data) ? data[0] : data;
  return {
    oldAudioUrl:
      result && typeof result.old_audio_url === "string"
        ? result.old_audio_url
        : null,
    oldPlaybackUrl:
      result && typeof result.old_playback_url === "string"
        ? result.old_playback_url
        : null,
    oldHlsUrl:
      result && typeof result.old_hls_url === "string"
        ? result.old_hls_url
        : null,
    liveStatus:
      result && typeof result.live_status === "string"
        ? result.live_status
        : null,
  };
}

export function getR2KeyFromSongUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value);
    return decodeURIComponent(url.pathname.replace(/^\/+/, ""));
  } catch {
    return null;
  }
}