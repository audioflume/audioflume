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
    <div className="admin-cue-point-standalone grid gap-3">
      <style>{`
        .admin-cue-point-standalone > div:first-of-type {
          overflow: hidden;
          border-radius: 10px !important;
          background: var(--bg-primary);
          padding: 0 !important;
        }

        .admin-cue-point-standalone .cue-point-review-header {
          margin: 0 !important;
          align-items: center !important;
          padding: 20px 20px 12px;
        }

        .admin-cue-point-standalone
          .cue-point-review-header
          > div:first-child
          > div:first-child {
          color: var(--text-primary) !important;
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: 16px !important;
          font-weight: 500 !important;
          line-height: 24px;
          letter-spacing: -0.03em !important;
          text-transform: none !important;
        }

        .admin-cue-point-standalone
          .cue-point-review-header
          > div:first-child
          > p {
          display: none;
        }

        .admin-cue-point-standalone .cue-point-review-right {
          flex-direction: row;
          align-items: center;
          gap: 8px;
        }

        .admin-cue-point-standalone .cue-point-dirty-state {
          min-height: 0;
          margin-right: 2px;
          font-size: 11px;
          line-height: 16px;
        }

        .admin-cue-point-standalone .cue-point-dirty-state:empty {
          display: none;
        }

        .admin-cue-point-standalone .cue-point-review-controls {
          gap: 8px;
        }

        .admin-cue-point-standalone .cue-point-review-controls > button {
          box-sizing: border-box;
          height: 32px !important;
          border-radius: 7px !important;
          padding-left: 12px !important;
          padding-right: 12px !important;
        }

        .admin-cue-point-standalone
          .cue-point-review-controls
          > button:last-child:not(:disabled) {
          border-color: var(--text-primary);
          background: var(--text-primary);
          color: var(--bg-primary);
        }

        .admin-cue-point-standalone
          > div:first-of-type
          > .mb-4:not(.cue-point-review-header) {
          margin: 0 20px 12px !important;
        }

        .admin-cue-point-standalone button[class~="rounded-full"] {
          border-radius: 7px !important;
        }

        .admin-cue-point-standalone
          > div:first-of-type
          > div[class~="grid"][class~="gap-3"] {
          margin: 0 20px 20px;
          grid-template-columns: 40px minmax(0, 1fr);
          gap: 12px;
        }

        .admin-cue-point-standalone .edit-point-play-button {
          height: 40px !important;
          width: 40px !important;
          border-radius: 7px !important;
        }

        .admin-cue-point-standalone
          div:has(> .edit-point-play-button)
          > button:last-child {
          height: 26px !important;
          width: 26px !important;
          border-radius: 7px !important;
        }

        .admin-cue-point-standalone
          div:has(> .edit-point-play-button)
          + div[role="button"] {
          height: 128px !important;
          border-radius: 7px !important;
          background: var(--bg-secondary) !important;
        }

        .admin-cue-point-standalone .cue-point-table-shell {
          margin-top: 0 !important;
          overflow: visible !important;
          border: 0 !important;
          border-top: 1px solid var(--border-subtle) !important;
          border-radius: 0 !important;
          clip-path: none !important;
        }

        .admin-cue-point-standalone .cue-point-row-grid {
          grid-template-columns:
            minmax(150px, 1fr)
            30px
            minmax(96px, 116px)
            minmax(96px, 110px)
            64px
            58px
            30px !important;
          column-gap: 10px !important;
          padding-left: 20px !important;
          padding-right: 20px !important;
        }

        .admin-cue-point-standalone
          .cue-point-table-shell
          > div
          > .cue-point-row-grid:first-child {
          min-height: 34px;
          border-bottom: 1px solid var(--border-subtle) !important;
          background: transparent !important;
          padding-top: 0 !important;
          padding-bottom: 0 !important;
          color: var(--text-muted) !important;
          font-size: 11px !important;
          font-weight: 500 !important;
          letter-spacing: normal !important;
          text-transform: none !important;
        }

        .admin-cue-point-standalone
          .cue-point-table-shell
          > div
          > .cue-point-row-grid:not(:first-child) {
          min-height: 62px;
          padding-top: 8px !important;
          padding-bottom: 8px !important;
        }

        .admin-cue-point-standalone
          .cue-point-table-shell
          > div
          > .cue-point-row-grid:not(:first-child):hover {
          background: var(--bg-hover);
        }

        .admin-cue-point-standalone .cue-point-row-grid button {
          border-radius: 7px !important;
        }

        .admin-cue-point-standalone .cue-point-row-grid input {
          height: 32px !important;
          border-radius: 7px !important;
          background: var(--bg-secondary) !important;
          font-family: inherit !important;
          font-size: 12px !important;
        }

        .admin-cue-point-standalone
          .cue-point-row-grid
          > div:nth-child(5)
          button {
          height: 28px !important;
          width: 28px !important;
        }

        .admin-cue-point-standalone .cue-point-delete-button {
          height: 28px !important;
          width: 28px !important;
        }

        .admin-cue-point-standalone > div:first-of-type > p:last-child {
          margin: 0;
          padding: 0 20px 16px;
        }

        @media (max-width: 920px) {
          .admin-cue-point-standalone .cue-point-review-right {
            align-items: flex-start;
          }

          .admin-cue-point-standalone
            > div:first-of-type
            > div[class~="grid"][class~="gap-3"] {
            grid-template-columns: 1fr;
          }

          .admin-cue-point-standalone
            div:has(> .edit-point-play-button) {
            flex-direction: row;
            justify-content: flex-start;
          }
        }
      `}</style>

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
          className={`rounded-[7px] border px-3 py-2 text-xs leading-5 ${
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
