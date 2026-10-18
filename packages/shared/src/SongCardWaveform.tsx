"use client";

import { forwardRef, type ReactNode } from "react";
import SharedWaveformCanvas, {
  type SharedWaveformCanvasHandle,
} from "./SharedWaveformCanvas";
import type { WaveformBarOptions } from "./waveform";

export type SongCardWaveformProps = {
  peaks: readonly number[];
  progress: number;
  overlay?: ReactNode;
  compact?: boolean;
  ariaLabel?: string;
  options?: WaveformBarOptions;
  onSeek?: (progress: number) => void;
  onPointerEnter?: () => void;
  resizeWhenVisibleOnly?: boolean;
};

export const SongCardWaveform = forwardRef<
  SharedWaveformCanvasHandle,
  SongCardWaveformProps
>(function SongCardWaveform(
  {
    peaks,
    progress,
    overlay,
    compact = false,
    ariaLabel = "Seek song",
    options,
    onSeek,
    onPointerEnter,
    resizeWhenVisibleOnly = false,
  },
  ref,
) {
  return (
    <SharedWaveformCanvas
      ref={ref}
      peaks={peaks}
      progress={progress}
      onSeek={onSeek}
      overlay={overlay}
      className={compact ? "filmwave-song-waveform is-compact" : "filmwave-song-waveform"}
      canvasClassName="filmwave-song-waveform-canvas"
      ariaLabel={ariaLabel}
      options={options}
      onPointerEnter={onPointerEnter}
      resizeWhenVisibleOnly={resizeWhenVisibleOnly}
    />
  );
});
