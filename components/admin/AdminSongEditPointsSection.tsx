"use client";

import { useEffect, useMemo, useState } from "react";
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

type AdminSongEditPointsSectionProps = {
  songId?: string;
  audioUrl: string;
  waveformPeaks: string;
  duration: string;
  onEditPointsJsonChange?: (value: string) => void;
};

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

function rowsToMarkers(rows: EditPointRow[]): EditPointMarker[] {
  return rows.flatMap((point) => {
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
}

function rowsToJson(rows: EditPointRow[]) {
  return JSON.stringify({
    markers: rowsToMarkers(rows),
    ranges: [],
  });
}

export default function AdminSongEditPointsSection({
  songId,
  audioUrl,
  waveformPeaks,
  duration,
  onEditPointsJsonChange,
}: AdminSongEditPointsSectionProps) {
  const [markers, setMarkers] = useState<EditPointMarker[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const durationSeconds = useMemo(() => parseDurationToSeconds(duration), [duration]);
  const canReview = !!songId && !!audioUrl && !!waveformPeaks;

  useEffect(() => {
    if (!songId) {
      setMarkers([]);
      onEditPointsJsonChange?.('{"markers":[],"ranges":[]}');
      return;
    }

    let cancelled = false;

    async function loadEditPoints() {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/admin/songs/${songId}/edit-points`, {
          cache: "no-store",
        });
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load edit points.");
        }

        if (cancelled) return;

        const rows = (data.editPoints || []) as EditPointRow[];
        setMarkers(rowsToMarkers(rows));
        onEditPointsJsonChange?.(data.editPointsJson || rowsToJson(rows));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load edit points.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadEditPoints();

    return () => {
      cancelled = true;
    };
  }, [songId, onEditPointsJsonChange]);

  if (!songId) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4">
        <div className="text-xs font-medium text-[var(--text-primary)]">
          Save the song first to review edit points.
        </div>
        <p className="mt-1 text-xs leading-5 text-[var(--text-secondary)]">
          Once the song exists in Supabase, the waveform edit point manager will appear here.
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

  if (error) {
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
          Add or keep an audio file and waveform peaks before reviewing edit points.
        </p>
      </div>
    );
  }

  return (
    <EditPointWaveformReview
      songId={songId}
      audioUrl={audioUrl}
      waveformPeaks={waveformPeaks}
      duration={durationSeconds}
      markers={markers}
    />
  );
}
