"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import RefreshIcon from "@/components/icons/RefreshIcon";
import TrashIcon from "@/components/icons/TrashIcon";

type EditPointMarker = {
  id: string;
  type: string;
  time: number;
  label: string;
  confidence: number;
  source: string;
};

type EditPointWaveformReviewProps = {
  songId: string;
  audioUrl: string | null;
  waveformPeaks: string;
  duration: number;
  markers: EditPointMarker[];
  showSaveButton?: boolean;
  saveVersion?: number;
  onChange?: (value: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  onReAnalyze?: () => Promise<void> | void;
  isReAnalyzing?: boolean;
};

type DragState =
  | { mode: "playhead" }
  | { mode: "point"; markerId: string };

const EDIT_POINT_TYPES = [
  { type: "first_hit", label: "First hit" },
  { type: "drop", label: "Main drop" },
  { type: "break", label: "Break" },
  { type: "button_ending", label: "Button ending" },
];

const MARKER_DESCRIPTIONS: Record<string, string> = {
  first_hit: "First meaningful musical entrance or clear usable hit.",
  drop: "Strongest energy transition or main section.",
  break: "Reduced-energy section, reset, or breathing point.",
  button_ending: "Clean ending hit, button, or final accent.",
};

const EMPTY_CUE_POINTS_JSON = '{"markers":[],"ranges":[]}';

function LoopMarkerIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M17 2.5L21 6.5L17 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3 11V9.5C3 7.843 4.343 6.5 6 6.5H21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 21.5L3 17.5L7 13.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 13V14.5C21 16.157 19.657 17.5 18 17.5H3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function formatTime(secondsValue: number) {
  const seconds = Number(secondsValue);

  if (!Number.isFinite(seconds) || seconds < 0) return "0:00.00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds - minutes * 60;

  return `${minutes}:${remainingSeconds.toFixed(2).padStart(5, "0")}`;
}

function parseTimeInput(value: string) {
  const trimmed = value.trim();

  if (!trimmed) return null;

  if (!trimmed.includes(":")) {
    const numeric = Number(trimmed);
    return Number.isFinite(numeric) ? numeric : null;
  }

  const parts = trimmed.split(":").map((part) => Number(part));

  if (parts.some((part) => !Number.isFinite(part))) return null;

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  }

  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
}

function parsePeaks(value: string) {
  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map((item) => Math.abs(Number(item)))
      .filter((item) => Number.isFinite(item));
  } catch {
    return [];
  }
}

function downsample(values: number[], targetLength = 220) {
  if (values.length <= targetLength) return values;

  const result: number[] = [];
  const blockSize = values.length / targetLength;

  for (let index = 0; index < targetLength; index++) {
    const start = Math.floor(index * blockSize);
    const end = Math.min(values.length, Math.floor((index + 1) * blockSize));
    let max = 0;

    for (let itemIndex = start; itemIndex < end; itemIndex++) {
      max = Math.max(max, values[itemIndex] || 0);
    }

    result.push(max);
  }

  return result;
}

function normalizePeaks(values: number[]) {
  const max = Math.max(...values, 1);

  return values.map((value) => value / max);
}

function clampTime(time: number, duration: number) {
  if (!Number.isFinite(time)) return 0;
  if (!duration || !Number.isFinite(duration) || duration <= 0) return Math.max(0, time);

  return Math.max(0, Math.min(duration, time));
}

function getConfidenceLabel(confidence: number) {
  if (confidence >= 0.75) return "High";
  if (confidence >= 0.45) return "Medium";
  if (confidence > 0) return "Low";

  return "Unknown";
}

function getMarkerDescription(type: string) {
  return MARKER_DESCRIPTIONS[type] || "Cue point marker.";
}

function createLocalMarkerId(type: string) {
  return `manual-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeMarkersForCompare(markers: EditPointMarker[]) {
  return markers
    .map((marker) => ({
      id: marker.id,
      type: marker.type,
      time: Number(Number(marker.time).toFixed(2)),
      label: marker.label,
      confidence: Number(Number(marker.confidence || 0).toFixed(4)),
      source: marker.source,
    }))
    .sort((a, b) => a.time - b.time || a.type.localeCompare(b.type));
}

function serializeMarkers(markers: EditPointMarker[]) {
  return JSON.stringify({
    markers: normalizeMarkersForCompare(markers),
    ranges: [],
  });
}

export default function EditPointWaveformReview({
  songId,
  audioUrl,
  waveformPeaks,
  duration,
  markers,
  showSaveButton = true,
  saveVersion = 0,
  onChange,
  onDirtyChange,
  onReAnalyze,
  isReAnalyzing = false,
}: EditPointWaveformReviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [localMarkers, setLocalMarkers] = useState(markers);
  const [baselineMarkers, setBaselineMarkers] = useState(markers);
  const [selectedMarkerId, setSelectedMarkerId] = useState(markers[0]?.id ?? "");
  const [spacebarStartsFromSelected, setSpacebarStartsFromSelected] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const peaks = useMemo(() => {
    return normalizePeaks(downsample(parsePeaks(waveformPeaks), 240));
  }, [waveformPeaks]);

  const effectiveDuration = duration > 0 ? duration : audioRef.current?.duration || 0;
  const progress = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;
  const hasChanges =
    JSON.stringify(normalizeMarkersForCompare(baselineMarkers)) !==
    JSON.stringify(normalizeMarkersForCompare(localMarkers));
  const sortedMarkers = [...localMarkers].sort((a, b) => a.time - b.time);
  const selectedMarker = localMarkers.find((marker) => marker.id === selectedMarkerId);
  const missingTypes = EDIT_POINT_TYPES.filter(
    (option) => !localMarkers.some((marker) => marker.type === option.type),
  );

  const stopCompetingAudio = () => {
    window.dispatchEvent(new Event("filmwave:close-player"));

    const currentAudio = audioRef.current;
    const audioElements = Array.from(document.querySelectorAll("audio"));

    audioElements.forEach((audio) => {
      if (audio === currentAudio) return;
      audio.pause();
    });
  };

  useEffect(() => {
    setLocalMarkers(markers);
    setBaselineMarkers(markers);
    setSelectedMarkerId(markers[0]?.id ?? "");
  }, [markers]);

  useEffect(() => {
    setBaselineMarkers(localMarkers);
    onDirtyChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveVersion]);

  useEffect(() => {
    onChange?.(localMarkers.length ? serializeMarkers(localMarkers) : EMPTY_CUE_POINTS_JSON);
    onDirtyChange?.(hasChanges);
  }, [localMarkers, hasChanges, onChange, onDirtyChange]);

  useEffect(() => {
    if (!hasChanges) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [hasChanges]);

  useEffect(() => {
    return () => {
      const audio = audioRef.current;

      if (!audio) return;

      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
    setCurrentTime(0);
  }, [songId, audioUrl]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName?.toLowerCase();
      const isTyping =
        tagName === "input" ||
        tagName === "textarea" ||
        tagName === "select" ||
        target?.isContentEditable;

      if (event.code === "Space" && !isTyping) {
        event.preventDefault();
        event.stopPropagation();
        togglePlayback(spacebarStartsFromSelected);
        return;
      }

      if (!selectedMarkerId || isTyping) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        event.stopPropagation();
        nudgeMarker(selectedMarkerId, event.shiftKey ? -1 : -0.1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        nudgeMarker(selectedMarkerId, event.shiftKey ? 1 : 0.1);
      }
    };

    window.addEventListener("keydown", onKeyDown, true);

    return () => window.removeEventListener("keydown", onKeyDown, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarkerId, localMarkers, isPlaying, audioUrl, effectiveDuration, spacebarStartsFromSelected]);

  useEffect(() => {
    const onPointerMove = (event: PointerEvent) => {
      const dragState = dragStateRef.current;

      if (!dragState) return;

      const nextTime = getTimeFromClientX(event.clientX);

      if (dragState.mode === "playhead") {
        seekToTime(nextTime);
        return;
      }

      updatePointTime(dragState.markerId, nextTime);
    };

    const onPointerUp = () => {
      dragStateRef.current = null;
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveDuration]);

  const playFromTime = async (time: number) => {
    const audio = audioRef.current;

    if (!audio || !audioUrl) return;

    stopCompetingAudio();
    audio.currentTime = clampTime(time, effectiveDuration);
    setCurrentTime(audio.currentTime);
    await audio.play();
    setIsPlaying(true);
  };

  const togglePlayback = async (startFromSelected = false) => {
    const audio = audioRef.current;

    if (!audio || !audioUrl) return;

    if (audio.paused) {
      stopCompetingAudio();

      if (startFromSelected && selectedMarker) {
        audio.currentTime = clampTime(selectedMarker.time, effectiveDuration);
        setCurrentTime(audio.currentTime);
      }

      await audio.play();
      setIsPlaying(true);
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const toggleMarkerRow = (markerId: string) => {
    setSelectedMarkerId((current) => (current === markerId ? "" : markerId));
  };

  const getTimeFromClientX = (clientX: number) => {
    const timeline = timelineRef.current;

    if (!timeline || effectiveDuration <= 0) return 0;

    const rect = timeline.getBoundingClientRect();
    const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));

    return percent * effectiveDuration;
  };

  const seekToTime = (time: number) => {
    const audio = audioRef.current;
    const nextTime = clampTime(time, effectiveDuration);

    if (audio) {
      stopCompetingAudio();
      audio.currentTime = nextTime;
    }

    setCurrentTime(nextTime);
  };

  const updatePointTime = (markerId: string, time: number) => {
    const nextTime = clampTime(time, effectiveDuration);

    setLocalMarkers((current) =>
      current.map((marker) =>
        marker.id === markerId
          ? {
              ...marker,
              time: Number(nextTime.toFixed(2)),
              confidence: 1,
              source: marker.source === "manual" ? "manual" : "corrected",
            }
          : marker,
      ),
    );
    setSelectedMarkerId(markerId);
    setSaveMessage("");
  };

  const addEditPoint = (type: string, label: string) => {
    const nextTime = clampTime(currentTime, effectiveDuration);
    const marker: EditPointMarker = {
      id: createLocalMarkerId(type),
      type,
      label,
      time: Number(nextTime.toFixed(2)),
      confidence: 1,
      source: "manual",
    };

    setLocalMarkers((current) => [...current, marker]);
    setSelectedMarkerId(marker.id);
    setSaveMessage("");
  };

  const deleteEditPoint = (markerId: string) => {
    setLocalMarkers((current) => {
      const next = current.filter((marker) => marker.id !== markerId);
      if (selectedMarkerId === markerId) {
        setSelectedMarkerId(next[0]?.id ?? "");
      }
      return next;
    });
    setSaveMessage("");
  };

  const nudgeMarker = (markerId: string, amount: number) => {
    const marker = localMarkers.find((item) => item.id === markerId);

    if (!marker) return;

    updatePointTime(markerId, marker.time + amount);
  };

  const setMarkerToPlayhead = (markerId: string) => {
    updatePointTime(markerId, currentTime);
  };

  const saveEditPoints = async () => {
    try {
      setIsSaving(true);
      setSaveMessage("");

      const res = await fetch(`/api/admin/songs/${songId}/edit-points`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          editPoints: localMarkers.map((marker) => ({
            id: marker.id,
            type: marker.type,
            time: marker.time,
            label: marker.label,
            confidence: marker.confidence,
            source: marker.source,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save cue points");
      }

      setBaselineMarkers(localMarkers);
      onDirtyChange?.(false);
      setSaveMessage(`Saved ${data.saved ?? localMarkers.length} cue points.`);
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? err.message : "Failed to save cue points.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4">
      <style>{`
        .edit-point-play-button {
          background: transparent;
          border: 1px solid var(--border);
          color: var(--text-secondary);
        }

        .edit-point-play-button:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .edit-point-progress-overlay {
          background: rgba(255, 255, 255, 0.022);
        }

        html.light .edit-point-progress-overlay {
          background: rgba(0, 0, 0, 0.022);
        }

        .cue-point-marker-line,
        .cue-point-marker-dot {
          background: var(--cue-point-marker);
        }

        .cue-point-marker-dot {
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--cue-point-marker) 16%, transparent);
        }

        html.light .edit-point-selected-dot {
          box-shadow: 0 0 0 3px rgba(0, 0, 0, 0.14);
        }

        .cue-point-review-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          align-items: end;
          gap: 1rem;
        }

        .cue-point-review-right {
          display: flex;
          min-width: 0;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.45rem;
        }

        .cue-point-dirty-state {
          min-height: 14px;
          font-size: 11px;
          font-weight: 500;
          line-height: 1;
          color: var(--status-warning);
        }

        .cue-point-review-controls {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 0.5rem;
          white-space: nowrap;
        }

        .cue-point-row-grid {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            clamp(30px, 4.2cqw, 34px)
            clamp(106px, 13.5cqw, 128px)
            clamp(100px, 12.5cqw, 116px)
            clamp(68px, 8.2cqw, 76px)
            clamp(76px, 9.4cqw, 92px)
            clamp(28px, 3.8cqw, 32px);
          column-gap: clamp(0.55rem, 1.1cqw, 0.85rem);
          align-items: center;
        }

        .cue-point-row-grid > * {
          min-width: 0;
        }

        .cue-point-row-grid > :nth-child(n + 2) {
          justify-self: start;
        }

        .cue-point-row-grid > :last-child {
          justify-self: end;
        }

        .cue-point-table-shell {
          container-type: inline-size;
          clip-path: inset(0 round 0.75rem);
        }

        .cue-point-delete-button {
          color: var(--text-muted);
          opacity: 0.68;
        }

        .cue-point-delete-button:hover {
          background: var(--status-error-soft, rgba(220, 88, 79, 0.12));
          color: var(--status-error, #dc584f);
          opacity: 1;
        }

        @container (max-width: 620px) {
          .cue-point-set-full-label {
            display: none;
          }

          .cue-point-row-grid {
            grid-template-columns:
              minmax(0, 1fr)
              clamp(28px, 5cqw, 30px)
              44px
              clamp(78px, 15cqw, 88px)
              58px
              clamp(56px, 11cqw, 68px)
              30px;
          }
        }

        @container (max-width: 540px) {
          .cue-point-row-grid {
            grid-template-columns:
              minmax(0, 1fr)
              clamp(28px, 5cqw, 30px)
              44px
              clamp(78px, 15cqw, 82px)
              58px
              30px;
          }

          .cue-point-source-column {
            display: none;
          }
        }

        @media (max-width: 920px) {
          .cue-point-review-header {
            grid-template-columns: 1fr;
            align-items: start;
          }

          .cue-point-review-right {
            align-items: flex-start;
          }

          .cue-point-review-controls {
            justify-content: flex-start;
          }
        }
      `}</style>

      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        preload="metadata"
        onLoadedMetadata={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onEnded={() => setIsPlaying(false)}
        onPause={() => setIsPlaying(false)}
        onPlay={() => setIsPlaying(true)}
      />

      <div className="cue-point-review-header mb-4">
        <div className="min-w-0">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Waveform Review
          </div>

          <p className="mt-1 max-w-[560px] text-xs text-[var(--text-secondary)]">
            Spacebar toggles playback. Drag cue points, drag the playhead, or set a marker to the current playhead time.
          </p>
        </div>

        <div className="cue-point-review-right">
          <div className="cue-point-dirty-state">
            {hasChanges ? "Unsaved cue point changes" : ""}
          </div>

          <div className="cue-point-review-controls">
            <div className="font-mono text-xs text-[var(--text-secondary)]">
              {formatTime(currentTime)} / {formatTime(effectiveDuration)}
            </div>

            {onReAnalyze && (
              <button
                type="button"
                onClick={() => onReAnalyze()}
                disabled={isReAnalyzing || isSaving}
                className="flex h-8 items-center gap-2 rounded-full border border-[var(--border)] px-3 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {isReAnalyzing ? (
                  <span className="h-3 w-3 animate-spin rounded-full border border-[var(--border)] border-t-[var(--text-primary)]" />
                ) : (
                  <RefreshIcon />
                )}
                Re-analyze
              </button>
            )}

            {showSaveButton && (
              <button
                type="button"
                onClick={saveEditPoints}
                disabled={isSaving || !hasChanges}
                className="h-8 rounded-full border border-[var(--border)] px-4 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
              >
                {isSaving ? "Saving..." : "Save Cue Points"}
              </button>
            )}
          </div>
        </div>
      </div>

      {missingTypes.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {missingTypes.map((option) => (
            <button
              key={option.type}
              type="button"
              onClick={() => addEditPoint(option.type, option.label)}
              title={getMarkerDescription(option.type)}
              className="h-8 rounded-full border border-[var(--border)] px-3 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              + {option.label}
            </button>
          ))}
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-[42px_minmax(0,1fr)] md:items-center">
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => togglePlayback(spacebarStartsFromSelected)}
            disabled={!audioUrl}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="edit-point-play-button flex h-10 w-10 items-center justify-center rounded-full transition hover:scale-[1.03] disabled:cursor-default disabled:opacity-40 disabled:hover:scale-100"
          >
            {isPlaying ? <PauseIcon size={16} /> : <PlayIconSmall size={16} />}
          </button>

          <button
            type="button"
            onClick={() => setSpacebarStartsFromSelected((value) => !value)}
            aria-pressed={spacebarStartsFromSelected}
            aria-label="Toggle spacebar start from selected marker"
            className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
              spacebarStartsFromSelected
                ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]"
                : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            }`}
            title="When active, pressing space to resume playback starts from the selected cue point."
          >
            <LoopMarkerIcon size={12} />
          </button>
        </div>

        <div
          ref={timelineRef}
          role="button"
          tabIndex={0}
          onPointerDown={(event) => {
            dragStateRef.current = { mode: "playhead" };
            seekToTime(getTimeFromClientX(event.clientX));
          }}
          className="relative h-28 cursor-ew-resize overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] outline-none transition focus:border-[var(--border)] focus-visible:outline-none focus-visible:ring-0"
        >
          <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--border)]" />

          <div
            className="edit-point-progress-overlay pointer-events-none absolute inset-y-0 left-0 z-10"
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
          />

          <div className="pointer-events-none absolute inset-0 flex items-center gap-px px-3">
            {peaks.length > 0 ? (
              peaks.map((peak, index) => (
                <span
                  key={`${index}-${peak}`}
                  className="flex-1 rounded-full bg-[var(--text-muted)] opacity-40"
                  style={{ height: `${Math.max(6, peak * 72)}px` }}
                />
              ))
            ) : (
              <div className="w-full text-center text-xs text-[var(--text-muted)]">
                No waveform peak data available.
              </div>
            )}
          </div>

          <div
            className="pointer-events-none absolute top-0 z-20 h-full w-px bg-[var(--text-primary)] opacity-15"
            style={{ left: `${Math.max(0, Math.min(100, progress))}%` }}
          />

          {localMarkers.map((marker) => {
            const left = effectiveDuration > 0 ? (marker.time / effectiveDuration) * 100 : 0;
            const selected = marker.id === selectedMarkerId;

            return (
              <button
                key={marker.id}
                type="button"
                onPointerDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  dragStateRef.current = { mode: "point", markerId: marker.id };
                  setSelectedMarkerId(marker.id);
                }}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedMarkerId(marker.id);
                }}
                className="absolute top-0 z-30 h-full w-6 -translate-x-1/2 cursor-ew-resize border-0 bg-transparent p-0"
                style={{ left: `${Math.max(0, Math.min(100, left))}%` }}
                title={`${marker.label} — ${formatTime(marker.time)} · ${getMarkerDescription(marker.type)}`}
              >
                <span
                  className={`absolute left-1/2 top-0 h-full w-px -translate-x-1/2 ${
                    selected ? "bg-[var(--text-primary)]" : "cue-point-marker-line"
                  }`}
                />
                <span
                  className={`absolute left-1/2 top-2 h-3 w-3 -translate-x-1/2 rounded-full ${
                    selected
                      ? "edit-point-selected-dot bg-[var(--text-primary)] shadow-[0_0_0_3px_rgba(255,255,255,0.16)]"
                      : "cue-point-marker-dot"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="cue-point-table-shell mt-4 overflow-hidden rounded-xl border border-[var(--border)]">
        <div>
          <div className="cue-point-row-grid border-b border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            <div>Marker</div>
            <div>Play</div>
            <div>Set</div>
            <div>Time</div>
            <div>Nudge</div>
            <div className="cue-point-source-column">Src</div>
            <div></div>
          </div>

          {sortedMarkers.length === 0 ? (
            <div className="px-3 py-5 text-xs text-[var(--text-secondary)]">
              No cue points yet. Use the add buttons above to create markers at the current playhead time.
            </div>
          ) : (
            sortedMarkers.map((marker) => {
              const selected = marker.id === selectedMarkerId;
              const confidenceLabel = `${getConfidenceLabel(marker.confidence)} · ${Math.round(marker.confidence * 100)}%`;

              return (
                <div
                  key={marker.id}
                  onClick={() => toggleMarkerRow(marker.id)}
                  className={`cue-point-row-grid cursor-pointer select-none border-b border-[var(--border-subtle)] px-3 py-2 text-xs outline-none transition last:border-b-0 ${
                    selected ? "bg-[var(--bg-hover)]" : ""
                  }`}
                >
                  <div className="min-w-0 text-left" title={getMarkerDescription(marker.type)}>
                    <div className="truncate font-medium text-[var(--text-primary)]">
                      {marker.label}
                    </div>
                    <div className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
                      {confidenceLabel}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedMarkerId(marker.id);
                      playFromTime(marker.time);
                    }}
                    aria-label={`Play from ${marker.label}`}
                    className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  >
                    <PlayIconSmall size={12} />
                  </button>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setMarkerToPlayhead(marker.id);
                    }}
                    className="h-7 w-fit rounded-full border border-[var(--border)] px-2 text-[11px] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  >
                    Set<span className="cue-point-set-full-label"> to playhead</span>
                  </button>

                  <input
                    type="text"
                    value={formatTime(marker.time)}
                    onClick={(event) => event.stopPropagation()}
                    onFocus={() => setSelectedMarkerId(marker.id)}
                    onChange={(event) => {
                      const parsed = parseTimeInput(event.target.value);

                      if (parsed == null) return;

                      updatePointTime(marker.id, parsed);
                    }}
                    className="h-8 w-full rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-2 font-mono text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-secondary)]"
                  />

                  <div className="flex items-center gap-1" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => nudgeMarker(marker.id, -0.1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] text-[11px] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => nudgeMarker(marker.id, 0.1)}
                      className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--border)] text-[11px] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                    >
                      +
                    </button>
                  </div>

                  <div className="cue-point-source-column truncate text-[11px] capitalize text-[var(--text-muted)]">
                    {marker.source}
                  </div>

                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteEditPoint(marker.id);
                    }}
                    aria-label={`Delete ${marker.label}`}
                    title={`Delete ${marker.label}`}
                    className="cue-point-delete-button flex h-7 w-7 items-center justify-center justify-self-end rounded-full transition"
                  >
                    <TrashIcon size={13} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {saveMessage && (
        <p className="mt-3 text-xs text-[var(--text-secondary)]">{saveMessage}</p>
      )}
    </div>
  );
}
