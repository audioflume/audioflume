"use client";

import {
  getEditPointFilterLabel,
  getMarkerType,
  type EditPoints,
} from "./editPointUtils";

function formatMarkerTime(secondsValue: number) {
  const seconds = Number(secondsValue);
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function getPercent(time: number, duration: number) {
  if (!duration) return 0;
  return Math.max(0, Math.min(100, (time / duration) * 100));
}

export function SongCardCuePointOverlay({
  editPoints,
  duration,
  highlightedEditPointTypes = [],
  compact = false,
  onSeek,
}: {
  editPoints: EditPoints;
  duration: number;
  highlightedEditPointTypes?: string[];
  compact?: boolean;
  onSeek?: (progress: number) => void;
}) {
  const highlightedTypeSet = new Set(highlightedEditPointTypes);
  const hasHighlightedTypes = highlightedTypeSet.size > 0;

  return (
    <>
      {editPoints.ranges?.map((range) => {
        const left = getPercent(range.start, duration);
        const right = getPercent(range.end, duration);
        const width = Math.max(0, right - left);
        const label = range.label.toLowerCase();
        const isStrong =
          label.includes("drop") ||
          label.includes("impact") ||
          label.includes("peak");

        return (
          <div
            key={range.id}
            className={`filmwave-song-cue-range${compact ? " is-compact" : ""}${
              isStrong ? " is-strong" : ""
            }`}
            style={{ left: `${left}%`, width: `${width}%` }}
          />
        );
      })}

      {editPoints.markers?.map((marker) => {
        const markerType = getMarkerType(marker);
        const selected = highlightedTypeSet.has(markerType);
        const hidden = hasHighlightedTypes && !selected;

        if (hidden) return null;

        const label = marker.label || getEditPointFilterLabel(markerType);
        const markerTime = formatMarkerTime(marker.time);
        const progress = duration ? marker.time / duration : 0;
        const safeProgress = Math.max(0, Math.min(1, progress));

        return (
          <button
            key={marker.id}
            type="button"
            className={`filmwave-song-cue-marker${compact ? " is-compact" : ""}`}
            style={{ left: `${getPercent(marker.time, duration)}%` }}
            aria-label={`Play from ${label} at ${markerTime}`}
            onPointerDown={(event) => {
              if (!onSeek) return;
              event.preventDefault();
              event.stopPropagation();
              onSeek(safeProgress);
            }}
          >
            <span
              className="filmwave-song-cue-marker-line"
              style={{
                width: hasHighlightedTypes
                  ? "var(--cue-marker-width-active)"
                  : "var(--cue-marker-width)",
                opacity: "var(--cue-marker-opacity)",
              }}
            />

            <span className="filmwave-song-cue-marker-label">
              {label} · {markerTime}
            </span>
          </button>
        );
      })}
    </>
  );
}
