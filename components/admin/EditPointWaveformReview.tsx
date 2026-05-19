"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";

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
};

type DragState =
  | { mode: "playhead" }
  | { mode: "point"; markerId: string };

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

export default function EditPointWaveformReview({
  songId,
  audioUrl,
  waveformPeaks,
  duration,
  markers,
}: EditPointWaveformReviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [localMarkers, setLocalMarkers] = useState(markers);
  const [selectedMarkerId, setSelectedMarkerId] = useState(markers[0]?.id ?? "");
  const [spacebarStartsFromSelected, setSpacebarStartsFromSelected] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");

  const peaks = useMemo(() => {
    return normalizePeaks(downsample(parsePeaks(waveformPeaks), 240));
  }, [waveformPeaks]);

  const effectiveDuration = duration > 0 ? duration : audioRef.current?.duration || 0;
  const progress = effectiveDuration > 0 ? (currentTime / effectiveDuration) * 100 : 0;
  const hasChanges = JSON.stringify(markers) !== JSON.stringify(localMarkers);
  const sortedMarkers = [...localMarkers].sort((a, b) => a.time - b.time);
  const selectedMarker = localMarkers.find((marker) => marker.id === selectedMarkerId);

  useEffect(() => {
    setLocalMarkers(markers);
    setSelectedMarkerId(markers[0]?.id ?? "");
  }, [markers]);

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
        togglePlayback(spacebarStartsFromSelected);
        return;
      }

      if (!selectedMarkerId || isTyping) return;

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        nudgeMarker(selectedMarkerId, event.shiftKey ? -1 : -0.1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        nudgeMarker(selectedMarkerId, event.shiftKey ? 1 : 0.1);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
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

    audio.currentTime = clampTime(time, effectiveDuration);
    setCurrentTime(audio.currentTime);
    await audio.play();
    setIsPlaying(true);
  };

  const togglePlayback = async (startFromSelected = false) => {
    const audio = audioRef.current;

    if (!audio || !audioUrl) return;

    if (audio.paused) {
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
              source: marker.source === "manual" ? "manual" : "corrected",
            }
          : marker,
      ),
    );
    setSelectedMarkerId(markerId);
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
        throw new Error(data?.error || "Failed to save edit points");
      }

      setSaveMessage(`Saved ${data.saved ?? localMarkers.length} edit points.`);
    } catch (err) {
      setSaveMessage(
        err instanceof Error ? err.message : "Failed to save edit points.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4">
      <style>{`
        html.light .edit-point-play-button {
          background: #ffffff;
          border-color: rgba(0, 0, 0, 0.08);
          color: #111111;
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            Waveform Review
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Spacebar toggles playback. Drag points, drag the playhead, or set a marker to the current playhead time.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="font-mono text-xs text-[var(--text-secondary)]">
            {formatTime(currentTime)} / {formatTime(effectiveDuration)}
          </div>

          <button
            type="button"
            onClick={saveEditPoints}
            disabled={isSaving || !hasChanges}
            className="h-8 rounded-full border border-[var(--border)] px-4 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {isSaving ? "Saving..." : "Save Edit Points"}
          </button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[42px_minmax(0,1fr)] md:items-center">
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => togglePlayback(false)}
            disabled={!audioUrl}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="edit-point-play-button flex h-10 w-10 items-center justify-center rounded-full border border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)] transition hover:scale-[1.03] hover:opacity-90 disabled:cursor-default disabled:opacity-40 disabled:hover:scale-100"
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
            title="When active, pressing space to resume playback starts from the selected edit point."
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
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft") seekToTime(currentTime - 1);
            if (event.key === "ArrowRight") seekToTime(currentTime + 1);
          }}
          className="relative h-28 cursor-ew-resize overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] outline-none transition focus:border-[var(--text-secondary)]"
        >
          <div className="absolute inset-x-0 top-1/2 h-px bg-[var(--border)]" />

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
            className="pointer-events-none absolute top-0 z-20 h-full w-[2px] bg-[var(--text-primary)]"
            style={{ left: `${Math.max(0, Math.min(100, progress))}%` }}
          >
            <div className="absolute left-1/2 top-2 h-2 w-2 -translate-x-1/2 rounded-full bg-[var(--text-primary)]" />
          </div>

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
                title={`${marker.label} — ${formatTime(marker.time)}`}
              >
                <span
                  className={`absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 ${
                    selected ? "bg-[var(--text-primary)]" : "bg-[var(--accent)]"
                  }`}
                />
                <span
                  className={`absolute left-1/2 top-2 h-3 w-3 -translate-x-1/2 rounded-full ${
                    selected
                      ? "bg-[var(--text-primary)] shadow-[0_0_0_3px_rgba(255,255,255,0.16)]"
                      : "bg-[var(--accent)] shadow-[0_0_0_3px_rgba(221,255,67,0.16)]"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-[var(--border)]">
        <div className="min-w-[860px]">
          <div className="grid grid-cols-[minmax(0,1fr)_54px_130px_120px_120px_110px_90px] border-b border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            <div>Marker</div>
            <div>Play</div>
            <div>Set</div>
            <div>Time</div>
            <div>Nudge</div>
            <div>Confidence</div>
            <div>Source</div>
          </div>

          {sortedMarkers.map((marker) => {
            const selected = marker.id === selectedMarkerId;

            return (
              <div
                key={marker.id}
                className={`grid grid-cols-[minmax(0,1fr)_54px_130px_120px_120px_110px_90px] items-center border-b border-[var(--border-subtle)] px-3 py-2 text-xs last:border-b-0 ${
                  selected ? "bg-[var(--bg-hover)]" : ""
                }`}
              >
                <button
                  type="button"
                  onClick={() => setSelectedMarkerId(marker.id)}
                  className="min-w-0 text-left"
                >
                  <div className="truncate font-medium text-[var(--text-primary)]">
                    {marker.label}
                  </div>
                  <div className="mt-1 truncate text-[11px] text-[var(--text-muted)]">
                    {marker.type}
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
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
                  onClick={() => setMarkerToPlayhead(marker.id)}
                  className="h-7 w-fit rounded-full border border-[var(--border)] px-3 text-[11px] text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                >
                  Set to playhead
                </button>

                <input
                  type="text"
                  value={formatTime(marker.time)}
                  onFocus={() => setSelectedMarkerId(marker.id)}
                  onChange={(event) => {
                    const parsed = parseTimeInput(event.target.value);

                    if (parsed == null) return;

                    updatePointTime(marker.id, parsed);
                  }}
                  className="h-8 w-24 rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-2 font-mono text-[12px] text-[var(--text-primary)] outline-none focus:border-[var(--text-secondary)]"
                />

                <div className="flex items-center gap-1">
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

                <span className="inline-flex h-8 w-fit items-center rounded-md border border-[var(--border)] bg-[var(--bg-primary)] px-2 text-[11px] text-[var(--text-secondary)]">
                  {getConfidenceLabel(marker.confidence)} · {Math.round(marker.confidence * 100)}%
                </span>

                <div className="text-[11px] capitalize text-[var(--text-muted)]">
                  {marker.source}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {saveMessage && (
        <p className="mt-3 text-xs text-[var(--text-secondary)]">{saveMessage}</p>
      )}
    </div>
  );
}
