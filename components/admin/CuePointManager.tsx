"use client";

import { useState } from "react";
import EditPointWaveformReview from "@/components/admin/EditPointWaveformReview";

type CuePointMarker = {
  id: string;
  type: string;
  time: number;
  label: string;
  confidence: number;
  source: string;
};

type CuePointManagerProps = {
  songId: string;
  audioUrl: string | null;
  waveformPeaks: string;
  duration: number;
  markers: CuePointMarker[];
};

type AnalyzeMarkerPayload = {
  id?: string;
  type?: string;
  time?: number | string;
  time_seconds?: number | string;
  label?: string | null;
  confidence?: number | string | null;
  source?: string | null;
};

function getTypeLabel(type: string) {
  if (type === "drop") return "Main Drop";

  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeAnalyzeMarker(marker: AnalyzeMarkerPayload): CuePointMarker | null {
  const type = String(marker.type || "").trim();
  const time = Number(marker.time_seconds ?? marker.time);

  if (!type || type === "intro_end" || !Number.isFinite(time) || time < 0) {
    return null;
  }

  const confidence = Number(marker.confidence ?? 0);

  return {
    id: marker.id || `analyzed-${type}-${time}`,
    type,
    time: Number(time.toFixed(2)),
    label: marker.label || getTypeLabel(type),
    confidence: Number.isFinite(confidence)
      ? Math.max(0, Math.min(1, confidence))
      : 0,
    source: marker.source || "auto",
  };
}

function getMarkersFromAnalyzeResponse(data: unknown) {
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};

  let rawMarkers: unknown[] = [];

  if (Array.isArray(record.editPoints)) {
    rawMarkers = record.editPoints;
  } else if (Array.isArray(record.points)) {
    rawMarkers = record.points;
  } else if (typeof record.editPointsJson === "string") {
    try {
      const parsed = JSON.parse(record.editPointsJson);
      rawMarkers = Array.isArray(parsed?.markers) ? parsed.markers : [];
    } catch {
      rawMarkers = [];
    }
  }

  return rawMarkers
    .map((marker) => normalizeAnalyzeMarker(marker as AnalyzeMarkerPayload))
    .filter((marker): marker is CuePointMarker => Boolean(marker))
    .sort((a, b) => a.time - b.time);
}

function getAnalyzeErrorMessage(data: unknown) {
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const detail = record.detail && typeof record.detail === "object"
    ? (record.detail as Record<string, unknown>)
    : null;

  if (typeof record.error === "string") return record.error;
  if (detail && typeof detail.error === "string") return detail.error;
  if (detail && typeof detail.detail === "string") return detail.detail;
  if (typeof record.message === "string") return record.message;

  return "Failed to re-analyze cue points.";
}

export default function CuePointManager({
  songId,
  audioUrl,
  waveformPeaks,
  duration,
  markers,
}: CuePointManagerProps) {
  const [currentMarkers, setCurrentMarkers] = useState(markers);
  const [isReAnalyzing, setIsReAnalyzing] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [reAnalyzeMessage, setReAnalyzeMessage] = useState("");
  const [reAnalyzeFailed, setReAnalyzeFailed] = useState(false);

  const handleReAnalyze = async () => {
    setIsReAnalyzing(true);
    setReAnalyzeMessage("");
    setReAnalyzeFailed(false);

    try {
      const response = await fetch(`/api/admin/songs/${songId}/analyze-edit-points`, {
        method: "POST",
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setReAnalyzeFailed(true);
        setReAnalyzeMessage(getAnalyzeErrorMessage(data));
        return;
      }

      const nextMarkers = getMarkersFromAnalyzeResponse(data);

      setCurrentMarkers(nextMarkers);
      setRefreshKey((value) => value + 1);
      setReAnalyzeMessage(
        nextMarkers.length > 0
          ? `Re-analyzed ${nextMarkers.length} cue point${nextMarkers.length === 1 ? "" : "s"}.`
          : "Re-analysis finished, but no cue points were returned.",
      );
    } catch (err) {
      setReAnalyzeFailed(true);
      setReAnalyzeMessage(
        err instanceof Error ? err.message : "Failed to re-analyze cue points.",
      );
    } finally {
      setIsReAnalyzing(false);
    }
  };

  return (
    <div className="grid gap-3">
      <EditPointWaveformReview
        key={refreshKey}
        songId={songId}
        audioUrl={audioUrl}
        waveformPeaks={waveformPeaks}
        duration={duration}
        markers={currentMarkers}
        onReAnalyze={handleReAnalyze}
        isReAnalyzing={isReAnalyzing}
      />

      {reAnalyzeMessage && (
        <div
          className={`rounded-lg border px-3 py-2 text-xs leading-5 ${
            reAnalyzeFailed
              ? "border-[var(--status-error-soft)] bg-[var(--status-error-soft)] text-[var(--status-error)]"
              : "border-[var(--status-success-soft)] bg-[var(--status-success-soft)] text-[var(--status-success)]"
          }`}
        >
          {reAnalyzeMessage}
        </div>
      )}
    </div>
  );
}
