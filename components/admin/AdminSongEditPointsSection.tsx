"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import EditPointWaveformReview from "@/components/admin/EditPointWaveformReview";

type EditPointRow = {
  id: string;
  song_id: string;
  type: string;
  time_seconds: number | string;
  label: string | null;
  confidence: number | string | null;
  source: string | null;
};

type EditPointMarker = {
  id: string;
  type: string;
  time: number;
  label: string;
  confidence: number;
  source: string;
};

type SongFormRecord = {
  audioUrl?: string;
  waveformPeaks?: string;
  duration?: string;
};

type AdminSongEditPointsSectionProps = {
  songId?: string;
  audioUrl?: string;
  waveformPeaks?: string;
  duration?: string;
  showSaveButton?: boolean;
  saveVersion?: number;
  onEditPointsJsonChange?: (value: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
};

const CANONICAL_CUE_TYPES = ["first_hit", "drop", "break", "button_ending"];
const CANONICAL_CUE_TYPE_SET = new Set(CANONICAL_CUE_TYPES);

function getTypeLabel(type: string) {
  if (type === "drop") return "Main Drop";

  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseDurationToSeconds(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return 0;

  if (!trimmed.includes(":")) {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  const parts = trimmed.split(":").map((part) => Number(part));

  if (parts.some((part) => !Number.isFinite(part))) return 0;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return 0;
}

function getConfidenceValue(confidence: number | string | null) {
  const value = Number(confidence ?? 0);

  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.min(1, value));
}

function getSourcePriority(source: string) {
  if (source === "manual") return 3;
  if (source === "corrected") return 2;
  if (source === "auto") return 1;
  return 0;
}

function dedupeCanonicalMarkers(markers: EditPointMarker[]) {
  const markerByType = new Map<string, EditPointMarker>();

  markers.forEach((marker) => {
    if (!CANONICAL_CUE_TYPE_SET.has(marker.type)) return;

    const existing = markerByType.get(marker.type);

    if (!existing) {
      markerByType.set(marker.type, marker);
      return;
    }

    const markerPriority = getSourcePriority(marker.source);
    const existingPriority = getSourcePriority(existing.source);

    if (markerPriority > existingPriority) {
      markerByType.set(marker.type, marker);
      return;
    }

    if (markerPriority === existingPriority && marker.confidence >= existing.confidence) {
      markerByType.set(marker.type, marker);
    }
  });

  return CANONICAL_CUE_TYPES.map((type) => markerByType.get(type)).filter(
    (marker): marker is EditPointMarker => Boolean(marker),
  );
}

function rowsToMarkers(rows: EditPointRow[]): EditPointMarker[] {
  const markers = rows.flatMap((point) => {
    const time = Number(point.time_seconds);

    if (!Number.isFinite(time)) return [];

    return [
      {
        id: point.id,
        type: point.type,
        time,
        label: point.label || getTypeLabel(point.type),
        confidence: getConfidenceValue(point.confidence),
        source: point.source || "auto",
      },
    ];
  });

  return dedupeCanonicalMarkers(markers);
}

function rowsToJson(rows: EditPointRow[]) {
  return JSON.stringify({
    markers: rowsToMarkers(rows),
    ranges: [],
  });
}

export default function AdminSongEditPointsSection({
  songId,
  audioUrl = "",
  waveformPeaks = "",
  duration = "",
  showSaveButton = true,
  saveVersion = 0,
  onEditPointsJsonChange,
  onDirtyChange,
}: AdminSongEditPointsSectionProps) {
  const [markers, setMarkers] = useState<EditPointMarker[]>([]);
  const [resolvedAudioUrl, setResolvedAudioUrl] = useState(audioUrl);
  const [resolvedWaveformPeaks, setResolvedWaveformPeaks] = useState(waveformPeaks);
  const [resolvedDuration, setResolvedDuration] = useState(duration);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);

  const durationSeconds = useMemo(
    () => parseDurationToSeconds(resolvedDuration),
    [resolvedDuration],
  );
  const canReview = !!songId && !!resolvedAudioUrl && !!resolvedWaveformPeaks;

  const stopGlobalPlayer = useCallback(() => {
    window.dispatchEvent(new Event("filmwave:close-player"));
  }, []);

  const loadEditPoints = useCallback(async () => {
    if (!songId) return;

    const res = await fetch(`/api/admin/songs/${songId}/edit-points`, {
      cache: "no-store",
    });
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.error || "Failed to load cue points.");
    }

    const rows = (data.editPoints || []) as EditPointRow[];
    const nextMarkers = rowsToMarkers(rows);

    setMarkers(nextMarkers);
    onEditPointsJsonChange?.(
      JSON.stringify({ markers: nextMarkers, ranges: [] }),
    );
  }, [songId, onEditPointsJsonChange]);

  const reAnalyzeCuePoints = useCallback(async () => {
    if (!songId) return;

    setIsReAnalyzing(true);
    setError("");

    try {
      const res = await fetch(`/api/admin/songs/${songId}/analyze-edit-points`, {
        method: "POST",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to re-analyze cue points.");
      }

      await loadEditPoints();
      onDirtyChange?.(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to re-analyze cue points.");
    } finally {
      setIsReAnalyzing(false);
    }
  }, [songId, loadEditPoints, onDirtyChange]);

  useEffect(() => {
    setResolvedAudioUrl(audioUrl);
    setResolvedWaveformPeaks(waveformPeaks);
    setResolvedDuration(duration);
  }, [audioUrl, waveformPeaks, duration]);

  useEffect(() => {
    if (!songId || (audioUrl && waveformPeaks)) return;

    let cancelled = false;

    async function loadSong() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/admin/songs/${songId}`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load song data.");
        }

        if (cancelled) return;

        const song = data as SongFormRecord;
        setResolvedAudioUrl(song.audioUrl || "");
        setResolvedWaveformPeaks(song.waveformPeaks || "");
        setResolvedDuration(song.duration || "");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load song data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadSong();

    return () => {
      cancelled = true;
    };
  }, [songId, audioUrl, waveformPeaks]);

  useEffect(() => {
    if (!songId) {
      setMarkers([]);
      onEditPointsJsonChange?.('{"markers":[],"ranges":[]}');
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");

      try {
        await loadEditPoints();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load cue points.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [songId, onEditPointsJsonChange, loadEditPoints]);

  if (!songId) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4">
        <div className="text-xs font-medium text-[var(--text-primary)]">
          Save the song first to review cue points.
        </div>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          Once the song exists in Supabase, the waveform cue point manager will appear here.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[160px] items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-primary)]">
        <LoadingSpinner size={24} stroke={8} color="var(--text-primary)" />
      </div>
    );
  }

  if (error && !canReview) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4">
        <div className="text-xs font-medium text-[var(--status-error,#dc584f)]">
          {error}
        </div>
      </div>
    );
  }

  if (!canReview) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4">
        <div className="text-xs font-medium text-[var(--text-primary)]">
          Audio and waveform data required
        </div>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          Add or keep an audio file and waveform peaks before reviewing cue points.
        </p>
      </div>
    );
  }

  return (
    <div
      className="admin-song-edit-points-review"
      onPointerDownCapture={stopGlobalPlayer}
      onKeyDownCapture={stopGlobalPlayer}
    >
      {error && (
        <div className="mb-3 rounded-lg border border-[var(--border)] bg-[var(--status-error-soft,rgba(220,88,79,0.12))] px-3 py-2 text-xs text-[var(--status-error,#dc584f)]">
          {error}
        </div>
      )}

      <EditPointWaveformReview
        songId={songId}
        audioUrl={resolvedAudioUrl}
        waveformPeaks={resolvedWaveformPeaks}
        duration={durationSeconds}
        markers={markers}
        showSaveButton={showSaveButton}
        saveVersion={saveVersion}
        onChange={onEditPointsJsonChange}
        onDirtyChange={onDirtyChange}
        onReAnalyze={reAnalyzeCuePoints}
        isReAnalyzing={isReAnalyzing}
      />
    </div>
  );
}
