"use client";

import type { Song } from "@/lib/types";
import { useEffect, useMemo, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import {
  getEditPointFilterLabel,
  getMarkerType,
  parseEditPoints,
} from "@/lib/editPointUtils";

type WaveformDrawCache = {
  cssWidth: number;
  cssHeight: number;
  dpr: number;
  progressColor: string;
  inactiveColor: string;
};

function getWaveformColors() {
  const styles = getComputedStyle(document.documentElement);

  return {
    progressColor: styles.getPropertyValue("--waveform-progress").trim(),
    inactiveColor: styles.getPropertyValue("--waveform-color").trim(),
  };
}

function drawWaveform(
  canvas: HTMLCanvasElement,
  peaks: number[],
  progress: number,
  cache: WaveformDrawCache,
  forceResize = false,
) {
  const container = canvas.parentElement;
  if (!container) return;

  const dpr = window.devicePixelRatio || 1;
  const w = container.clientWidth;
  const h = canvas.clientHeight || 24;

  if (w < 10) return;

  const sizeChanged =
    forceResize ||
    cache.cssWidth !== w ||
    cache.cssHeight !== h ||
    cache.dpr !== dpr;

  if (sizeChanged) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    cache.cssWidth = w;
    cache.cssHeight = h;
    cache.dpr = dpr;
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const barWidth = 2;
  const barGap = 1;
  const barTotal = barWidth + barGap;
  const barCount = Math.max(1, Math.floor(w / barTotal));
  const midY = h / 2;

  let maxVal = 0;

  for (let i = 0; i < peaks.length; i++) {
    const value = Math.abs(peaks[i]);
    if (value > maxVal) maxVal = value;
  }

  const scale = maxVal > 0 ? 1 / maxVal : 1;
  const samplesPerBar = Math.max(1, Math.ceil(peaks.length / barCount));
  const progressBars = Math.floor(
    barCount * Math.max(0, Math.min(1, progress)),
  );

  for (let i = 0; i < barCount; i++) {
    const start = i * samplesPerBar;
    const end = Math.min(peaks.length, start + samplesPerBar);

    let barPeak = 0;

    for (let j = start; j < end; j++) {
      const value = Math.abs(peaks[j]);

      if (value > barPeak) {
        barPeak = value;
      }
    }

    const peak = barPeak * scale;
    const maxBarH = h * 0.85;
    const barH = Math.max(2, Math.min(maxBarH, peak * maxBarH));
    const x = i * barTotal;

    ctx.fillStyle = i < progressBars ? cache.progressColor : cache.inactiveColor;
    ctx.fillRect(x, midY - barH / 2, barWidth, barH);
  }
}

function formatMarkerTime(secondsValue: number) {
  const seconds = Number(secondsValue);

  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function Waveform({
  song,
  compact = false,
  highlightedEditPointTypes = [],
  showEditPointMarkers,
}: {
  song: Song;
  compact?: boolean;
  highlightedEditPointTypes?: string[];
  showEditPointMarkers?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const peaksRef = useRef<number[]>([]);
  const animationFrameRef = useRef<number | null>(null);
  const drawCacheRef = useRef<WaveformDrawCache>({
    cssWidth: 0,
    cssHeight: 0,
    dpr: 0,
    ...getWaveformColors(),
  });

  const { showEditPointMarkers: globalShowEditPointMarkers } = useUserPreferences();
  const shouldShowEditPointMarkers =
    showEditPointMarkers ?? globalShowEditPointMarkers;

  const {
    registerWaveform,
    unregisterWaveform,
    seekTo: contextSeekTo,
    isPlaying,
    currentSong,
  } = usePlayer();

  const isPlayingRef = useRef(isPlaying);
  const currentSongIdRef = useRef<string | null>(currentSong?.id ?? null);

  const editPoints = useMemo(
    () => parseEditPoints(song.editPoints),
    [song.editPoints],
  );

  const highlightedTypeSet = useMemo(
    () => new Set(highlightedEditPointTypes),
    [highlightedEditPointTypes],
  );

  const hasHighlightedTypes = highlightedTypeSet.size > 0;

  const getPercent = (time: number) => {
    if (!song.duration) return 0;

    return Math.max(0, Math.min(100, (time / song.duration) * 100));
  };

  const cancelScheduledRedraw = () => {
    if (animationFrameRef.current == null) return;

    window.cancelAnimationFrame(animationFrameRef.current);
    animationFrameRef.current = null;
  };

  const redraw = (forceResize = false) => {
    if (!canvasRef.current) return;

    drawWaveform(
      canvasRef.current,
      peaksRef.current,
      progressRef.current,
      drawCacheRef.current,
      forceResize,
    );
  };

  const scheduleRedraw = () => {
    if (animationFrameRef.current != null) return;

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;
      redraw();
    });
  };

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    currentSongIdRef.current = currentSong?.id ?? null;
  }, [isPlaying, currentSong?.id]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(song.waveformPeaks);

      peaksRef.current = Array.isArray(parsed) ? parsed : [];
    } catch {
      peaksRef.current = [];
    }

    progressRef.current = 0;
    redraw(true);
  }, [song.waveformPeaks]);

  useEffect(() => {
    registerWaveform(song.id, {
      seekTo: (progress: number) => {
        progressRef.current = progress;
        scheduleRedraw();
      },
    });

    return () => unregisterWaveform(song.id);
  }, [song.id, registerWaveform, unregisterWaveform]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      redraw(true);
    });

    resizeObserver.observe(container);

    const themeObserver = new MutationObserver(() => {
      drawCacheRef.current = {
        ...drawCacheRef.current,
        ...getWaveformColors(),
      };
      redraw();
    });

    themeObserver.observe(document.documentElement, {
      attributeFilter: ["class"],
    });

    return () => {
      cancelScheduledRedraw();
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  const seekToProgress = (progress: number) => {
    progressRef.current = progress;
    contextSeekTo(song, progress, isPlayingRef.current);
    scheduleRedraw();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    if (!rect.width) return;

    const progress = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );

    seekToProgress(progress);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 cursor-pointer overflow-visible ${
        compact ? "h-[14px]" : "h-6"
      }`}
      onPointerDown={handlePointerDown}
    >
      {shouldShowEditPointMarkers &&
        editPoints.ranges?.map((range) => {
          const left = getPercent(range.start);
          const right = getPercent(range.end);
          const width = Math.max(0, right - left);
          const label = range.label.toLowerCase();

          const isStrong =
            label.includes("drop") ||
            label.includes("impact") ||
            label.includes("peak");

          return (
            <div
              key={range.id}
              className="pointer-events-none absolute z-10"
              style={{
                top: "50%",
                height: compact ? "18px" : "34px",
                transform: "translateY(-50%)",
                left: `${left}%`,
                width: `${width}%`,
                background: isStrong
                  ? "var(--cue-point-range-strong)"
                  : "var(--cue-point-range)",
              }}
            />
          );
        })}

      {shouldShowEditPointMarkers &&
        editPoints.markers?.map((marker) => {
          const markerType = getMarkerType(marker);
          const selected = highlightedTypeSet.has(markerType);
          const hidden = hasHighlightedTypes && !selected;

          if (hidden) return null;

          const label = marker.label || getEditPointFilterLabel(markerType);
          const markerTime = formatMarkerTime(marker.time);
          const progress = song.duration ? marker.time / song.duration : 0;

          return (
            <button
              key={marker.id}
              type="button"
              className="group/edit-point-marker absolute top-1/2 z-20 h-[38px] w-5 -translate-x-1/2 -translate-y-1/2 cursor-pointer border-0 bg-transparent p-0"
              style={{
                left: `${getPercent(marker.time)}%`,
              }}
              aria-label={`Play from ${label} at ${markerTime}`}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                seekToProgress(Math.max(0, Math.min(1, progress)));
              }}
            >
              <span
                className="absolute left-1/2 top-0 h-full -translate-x-1/2 rounded-full transition-[width,opacity] duration-150 group-hover/edit-point-marker:opacity-100"
                style={{
                  width: hasHighlightedTypes
                    ? "var(--cue-marker-width-active)"
                    : "var(--cue-marker-width)",
                  opacity: "var(--cue-marker-opacity)",
                  background: "var(--cue-marker-color)",
                }}
              />

              <span className="pointer-events-none absolute bottom-[calc(100%+8px)] left-1/2 z-40 flex -translate-x-1/2 translate-y-1 items-center whitespace-nowrap rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)] opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.18)] transition duration-150 group-hover/edit-point-marker:translate-y-0 group-hover/edit-point-marker:opacity-100">
                {label} · {markerTime}
              </span>
            </button>
          );
        })}

      <canvas
        ref={canvasRef}
        className="relative z-0"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
