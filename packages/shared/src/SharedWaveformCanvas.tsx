"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  buildWaveformBars,
  createWaveformCanvasDrawCache,
  drawWaveformBarsToCanvas,
  type WaveformCanvasDrawCache,
  type WaveformColors,
  type WaveformBarOptions,
} from "./waveform";

const DEFAULT_BAR_WIDTH = 2;
const DEFAULT_BAR_GAP = 1;

function getWaveformColors(): WaveformColors {
  const styles = getComputedStyle(document.documentElement);

  return {
    progressColor: styles.getPropertyValue("--waveform-progress").trim(),
    inactiveColor: styles.getPropertyValue("--waveform-color").trim(),
  };
}

export type SharedWaveformCanvasProps = {
  peaks: readonly number[];
  progress: number;
  onSeek?: (progress: number) => void;
  overlay?: ReactNode;
  className?: string;
  canvasClassName?: string;
  ariaLabel?: string;
  options?: WaveformBarOptions;
};

export default function SharedWaveformCanvas({
  peaks,
  progress,
  onSeek,
  overlay,
  className = "filmwave-player-waveform",
  canvasClassName = "filmwave-player-waveform-canvas",
  ariaLabel = "Seek",
  options,
}: SharedWaveformCanvasProps) {
  const waveformRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformBarsRef = useRef<number[]>([]);
  const waveformProgressRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const drawCacheRef = useRef<WaveformCanvasDrawCache>(
    createWaveformCanvasDrawCache(),
  );

  const [waveformWidth, setWaveformWidth] = useState(0);

  const barWidth = options?.barWidth ?? DEFAULT_BAR_WIDTH;
  const barGap = options?.barGap ?? DEFAULT_BAR_GAP;

  const waveformBars = useMemo(
    () => buildWaveformBars(peaks, waveformWidth, options),
    [peaks, waveformWidth, options],
  );

  const safeProgress = Number.isFinite(progress)
    ? Math.max(0, Math.min(1, progress))
    : 0;

  const drawCanvas = useCallback((forceResize = false) => {
    const canvas = canvasRef.current;
    const bars = waveformBarsRef.current;

    if (!canvas || !bars.length) return;

    drawWaveformBarsToCanvas({
      canvas,
      bars,
      progress: waveformProgressRef.current,
      cache: drawCacheRef.current,
      colors: getWaveformColors(),
      forceResize,
      options: { barWidth, barGap },
    });
  }, [barGap, barWidth]);

  const scheduleDraw = useCallback(
    (forceResize = false) => {
      if (animationFrameRef.current != null) return;

      animationFrameRef.current = window.requestAnimationFrame(() => {
        animationFrameRef.current = null;
        drawCanvas(forceResize);
      });
    },
    [drawCanvas],
  );

  useEffect(() => {
    waveformBarsRef.current = waveformBars;
    waveformProgressRef.current = safeProgress;
    scheduleDraw();
  }, [waveformBars, safeProgress, scheduleDraw]);

  useEffect(() => {
    const waveform = waveformRef.current;
    if (!waveform) return;

    const updateWidth = () => {
      setWaveformWidth(Math.floor(waveform.getBoundingClientRect().width));
      scheduleDraw(true);
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(waveform);
    window.addEventListener("resize", updateWidth);

    const timeout = window.setTimeout(updateWidth, 50);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateWidth);
      window.clearTimeout(timeout);
    };
  }, [scheduleDraw]);

  useEffect(() => {
    const observer = new MutationObserver(() => scheduleDraw(true));
    observer.observe(document.documentElement, {
      attributeFilter: ["class", "data-theme"],
    });

    return () => {
      observer.disconnect();

      if (animationFrameRef.current != null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [scheduleDraw]);

  function seek(clientX: number) {
    const waveform = waveformRef.current;
    if (!waveform || !onSeek) return;

    const rect = waveform.getBoundingClientRect();
    if (!rect.width) return;

    const nextProgress = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    waveformProgressRef.current = nextProgress;
    onSeek(nextProgress);
    scheduleDraw();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
    }
  }

  return (
    <div
      ref={waveformRef}
      data-player-waveform-slot
      className={className}
      role={onSeek ? "button" : undefined}
      tabIndex={onSeek ? 0 : undefined}
      aria-label={onSeek ? ariaLabel : undefined}
      onClick={onSeek ? (event) => seek(event.clientX) : undefined}
      onKeyDown={onSeek ? handleKeyDown : undefined}
    >
      {overlay}
      <canvas
        ref={canvasRef}
        className={canvasClassName}
        style={{ display: "block" }}
      />
    </div>
  );
}
