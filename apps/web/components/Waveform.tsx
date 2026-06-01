"use client";

import type { Song } from "@/lib/types";
import { useEffect, useMemo, useRef } from "react";
import { usePlayer } from "@/context/PlayerContext";
import { useUserPreferences } from "@/context/UserPreferencesContext";
import { parseEditPoints, SongCardCuePointOverlay } from "@filmwave/shared";

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

function getSongSource(song: Song) {
  return song.hlsUrl || song.playbackUrl || song.audioUrl;
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
  const preloadedAudioRef = useRef<HTMLAudioElement | null>(null);
  const preloadedSourceRef = useRef("");
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

  const preloadSongSource = () => {
    const source = getSongSource(song);

    if (!source || preloadedSourceRef.current === source) return;

    const audio = new Audio();
    audio.preload = "auto";
    audio.src = source;
    audio.load();

    preloadedAudioRef.current = audio;
    preloadedSourceRef.current = source;
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
    const shouldPlay = isPlayingRef.current;

    progressRef.current = progress;
    redraw();
    contextSeekTo(song, progress, shouldPlay);
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
      onPointerEnter={preloadSongSource}
      onPointerDown={handlePointerDown}
    >
      {shouldShowEditPointMarkers && (
        <SongCardCuePointOverlay
          editPoints={editPoints}
          duration={song.duration}
          highlightedEditPointTypes={highlightedEditPointTypes}
          compact={compact}
          onSeek={seekToProgress}
        />
      )}

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
