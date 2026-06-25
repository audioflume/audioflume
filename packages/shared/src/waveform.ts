export type WaveformCanvasDrawCache = {
  cssWidth: number;
  cssHeight: number;
  dpr: number;
};

export type WaveformColors = {
  progressColor: string;
  inactiveColor: string;
};

export type WaveformBarOptions = {
  barWidth?: number;
  barGap?: number;
  minBarHeight?: number;
  maxBarHeight?: number;
};

export const DEFAULT_WAVEFORM_BAR_WIDTH = 1;
export const DEFAULT_WAVEFORM_BAR_GAP = 1;

export function createWaveformCanvasDrawCache(): WaveformCanvasDrawCache {
  return {
    cssWidth: 0,
    cssHeight: 0,
    dpr: 0,
  };
}

export function normalizeWaveformPeaks(peaks: readonly number[]) {
  let maxValue = 0;

  for (let index = 0; index < peaks.length; index += 1) {
    const value = Math.abs(Number(peaks[index]) || 0);
    if (value > maxValue) maxValue = value;
  }

  if (maxValue <= 0) return peaks.map(() => 0);

  return peaks.map((peak) => Math.abs(Number(peak) || 0) / maxValue);
}

export function parseWaveformPeaks(value: unknown) {
  if (Array.isArray(value)) {
    return value.map(Number).filter(Number.isFinite);
  }

  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.map(Number).filter(Number.isFinite)
      : [];
  } catch {
    return [];
  }
}

export function buildWaveformBars(
  peaks: readonly number[],
  width: number,
  options: WaveformBarOptions = {},
) {
  if (!peaks.length || width <= 0) return [];

  const barWidth = options.barWidth ?? DEFAULT_WAVEFORM_BAR_WIDTH;
  const barGap = options.barGap ?? DEFAULT_WAVEFORM_BAR_GAP;
  const minBarHeight = options.minBarHeight ?? 2;
  const maxBarHeight = options.maxBarHeight ?? 20;
  const barTotal = barWidth + barGap;
  const barCount = Math.max(1, Math.floor(width / barTotal));
  const normalizedPeaks = normalizeWaveformPeaks(peaks);
  const samplesPerBar = normalizedPeaks.length / barCount;

  return Array.from({ length: barCount }, (_, index) => {
    const start = Math.floor(index * samplesPerBar);
    const end = Math.min(
      normalizedPeaks.length,
      Math.floor((index + 1) * samplesPerBar),
    );
    let barPeak = 0;

    for (let peakIndex = start; peakIndex < end; peakIndex += 1) {
      if (normalizedPeaks[peakIndex] > barPeak) {
        barPeak = normalizedPeaks[peakIndex];
      }
    }

    return Math.max(
      minBarHeight,
      Math.min(maxBarHeight, barPeak * maxBarHeight),
    );
  });
}

export function buildWaveformPercentBars(
  peaks: readonly number[],
  width: number,
  {
    barWidth = DEFAULT_WAVEFORM_BAR_WIDTH,
    barGap = DEFAULT_WAVEFORM_BAR_GAP,
    minVisibleBars = 8,
    maxVisibleBars = 220,
    minPercent = 12,
    maxPercent = 100,
  }: WaveformBarOptions & {
    minVisibleBars?: number;
    maxVisibleBars?: number;
    minPercent?: number;
    maxPercent?: number;
  } = {},
) {
  if (!peaks.length) return [];

  const normalizedPeaks = normalizeWaveformPeaks(peaks);

  if (width <= 0) {
    return normalizedPeaks.map((peak) =>
      Math.max(minPercent, Math.min(maxPercent, peak * maxPercent)),
    );
  }

  const slotWidth = barWidth + barGap;
  const visibleCount = Math.min(
    maxVisibleBars,
    Math.max(minVisibleBars, Math.floor((width + barGap) / slotWidth)),
  );

  if (visibleCount <= 1) {
    return [
      Math.max(
        minPercent,
        Math.min(maxPercent, (normalizedPeaks[0] ?? 0) * maxPercent),
      ),
    ];
  }

  return Array.from({ length: visibleCount }, (_, index) => {
    const sourcePosition =
      (index / (visibleCount - 1)) * (normalizedPeaks.length - 1);
    const lowerIndex = Math.floor(sourcePosition);
    const upperIndex = Math.min(
      normalizedPeaks.length - 1,
      Math.ceil(sourcePosition),
    );
    const progress = sourcePosition - lowerIndex;
    const lowerValue = normalizedPeaks[lowerIndex] ?? 0;
    const upperValue = normalizedPeaks[upperIndex] ?? lowerValue;
    const value = lowerValue + (upperValue - lowerValue) * progress;

    return Math.max(minPercent, Math.min(maxPercent, value * maxPercent));
  });
}

export function drawWaveformBarsToCanvas({
  canvas,
  bars,
  progress,
  cache,
  colors,
  forceResize = false,
  options = {},
}: {
  canvas: HTMLCanvasElement;
  bars: readonly number[];
  progress: number;
  cache: WaveformCanvasDrawCache;
  colors: WaveformColors;
  forceResize?: boolean;
  options?: Pick<WaveformBarOptions, "barWidth" | "barGap">;
}) {
  if (!bars.length) return;

  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth;
  const height = canvas.clientHeight || 24;

  if (width < 4) return;

  const sizeChanged =
    forceResize ||
    cache.cssWidth !== width ||
    cache.cssHeight !== height ||
    cache.dpr !== dpr;

  if (sizeChanged) {
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    cache.cssWidth = width;
    cache.cssHeight = height;
    cache.dpr = dpr;
  }

  const context = canvas.getContext("2d");
  if (!context) return;

  const barWidth = Math.min(
    options.barWidth ?? DEFAULT_WAVEFORM_BAR_WIDTH,
    DEFAULT_WAVEFORM_BAR_WIDTH,
  );
  const barGap = options.barGap ?? DEFAULT_WAVEFORM_BAR_GAP;
  const barTotal = barWidth + barGap;
  const safeProgress = Number.isFinite(progress)
    ? Math.max(0, Math.min(1, progress))
    : 0;
  const progressBars = Math.floor(bars.length * safeProgress);
  const midY = height / 2;

  context.setTransform(dpr, 0, 0, dpr, 0, 0);
  context.clearRect(0, 0, width, height);

  for (let index = 0; index < bars.length; index += 1) {
    const barHeight = bars[index];
    context.fillStyle =
      index < progressBars ? colors.progressColor : colors.inactiveColor;
    context.fillRect(
      index * barTotal,
      midY - barHeight / 2,
      barWidth,
      barHeight,
    );
  }
}
