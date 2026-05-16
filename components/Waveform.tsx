"use client";

import type { EditPoints, Song } from "@/lib/types";
import { useEffect, useMemo, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";

function parseEditPoints(value: Song["editPoints"]): EditPoints {
  if (!value) {
    return {
      markers: [],
      ranges: [],
    };
  }

  try {
    const parsed = JSON.parse(value);

    return {
      markers: Array.isArray(parsed.markers) ? parsed.markers : [],
      ranges: Array.isArray(parsed.ranges) ? parsed.ranges : [],
    };
  } catch {
    return {
      markers: [],
      ranges: [],
    };
  }
}

function drawWaveform(
  canvas: HTMLCanvasElement,
  peaks: number[],
  progress: number,
) {
  const container = canvas.parentElement;
  if (!container) return;

  const dpr = window.devicePixelRatio || 1;
  const w = container.clientWidth;
  const h = canvas.clientHeight || 24;

  if (w < 10) return;

  canvas.width = w * dpr;
  canvas.height = h * dpr;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  const styles = getComputedStyle(document.documentElement);

  const progressColor = styles.getPropertyValue("--waveform-progress").trim();
  const inactiveColor = styles.getPropertyValue("--waveform-color").trim();

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

    ctx.fillStyle = i < progressBars ? progressColor : inactiveColor;
    ctx.fillRect(x, midY - barH / 2, barWidth, barH);
  }
}

export default function Waveform({
  song,
  compact = false,
}: {
  song: Song;
  compact?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef(0);
  const peaksRef = useRef<number[]>([]);

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

  const getPercent = (time: number) => {
    if (!song.duration) return 0;

    return Math.max(0, Math.min(100, (time / song.duration) * 100));
  };

  const redraw = () => {
    if (!canvasRef.current) return;

    drawWaveform(canvasRef.current, peaksRef.current, progressRef.current);
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
    redraw();
  }, [song.waveformPeaks]);

  useEffect(() => {
    registerWaveform(song.id, {
      seekTo: (progress: number) => {
        progressRef.current = progress;
        redraw();
      },
    });

    return () => unregisterWaveform(song.id);
  }, [song.id, registerWaveform, unregisterWaveform]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      redraw();
    });

    resizeObserver.observe(container);

    const themeObserver = new MutationObserver(() => {
      redraw();
    });

    themeObserver.observe(document.documentElement, {
      attributeFilter: ["class"],
    });

    return () => {
      resizeObserver.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    const rect = e.currentTarget.getBoundingClientRect();

    if (!rect.width) return;

    const progress = Math.max(
      0,
      Math.min(1, (e.clientX - rect.left) / rect.width),
    );

    progressRef.current = progress;
    redraw();

    contextSeekTo(song, progress, isPlayingRef.current);
  };

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 cursor-pointer overflow-visible ${
        compact ? "h-[14px]" : "h-6"
      }`}
      onPointerDown={handlePointerDown}
    >
      {editPoints.ranges?.map((range) => {
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
                ? "var(--edit-point-range-strong)"
                : "var(--edit-point-range)",
            }}
            title={range.label}
          />
        );
      })}

      {editPoints.markers?.map((marker) => {
        const label = marker.label.toLowerCase();

        const isStrong =
          label.includes("drop") ||
          label.includes("impact") ||
          label.includes("peak");

        return (
          <div
            key={marker.id}
            className="pointer-events-none absolute z-20 w-[1px]"
            style={{
              top: "50%",
              height: "34px",
              transform: "translateY(-50%)",
              left: `${getPercent(marker.time)}%`,
              background: isStrong
                ? "var(--edit-point-marker-secondary)"
                : "var(--edit-point-marker)",
            }}
            title={marker.label}
          />
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
