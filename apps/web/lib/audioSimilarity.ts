import ffmpegPath from "ffmpeg-static";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import path from "node:path";

const FFMPEG_EXECUTABLE_NAME =
  process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
const SAMPLE_RATE = 11025;
const ANALYSIS_SECONDS = 30;
const FFT_SIZE = 1024;
const SPECTRAL_FRAME_COUNT = 36;
const MEL_BAND_COUNT = 20;
const MFCC_COUNT = 13;
const CACHE_TTL_MS = 60 * 60 * 1000;
const MAX_PCM_BYTES = SAMPLE_RATE * ANALYSIS_SECONDS * 2 + 1024 * 128;

export type AudioSimilarityFeatures = {
  spectralBands: number[];
  mfccMean: number[];
  mfccStd: number[];
  chroma: number[];
  centroidMean: number;
  centroidStd: number;
  rolloffMean: number;
  rolloffStd: number;
  flatnessMean: number;
  flatnessStd: number;
  rmsMean: number;
  rmsStd: number;
  onsetDensity: number;
  estimatedBpm: number | null;
};

const featureCache = new Map<
  string,
  {
    expiresAt: number;
    features: AudioSimilarityFeatures;
  }
>();

let resolvedFfmpegPath: string | null = null;

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveFfmpegPath() {
  if (resolvedFfmpegPath) return resolvedFfmpegPath;

  const candidates = [
    process.env.FFMPEG_PATH,
    ffmpegPath || undefined,
    path.join(
      process.cwd(),
      "node_modules",
      "ffmpeg-static",
      FFMPEG_EXECUTABLE_NAME,
    ),
    path.join(
      process.cwd(),
      "..",
      "..",
      "node_modules",
      "ffmpeg-static",
      FFMPEG_EXECUTABLE_NAME,
    ),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of [...new Set(candidates)]) {
    if (await fileExists(candidate)) {
      resolvedFfmpegPath = candidate;
      return resolvedFfmpegPath;
    }
  }

  resolvedFfmpegPath = "ffmpeg";
  return resolvedFfmpegPath;
}

async function decodeAudioToPcm(sourceUrl: string) {
  const ffmpegCommand = await resolveFfmpegPath();

  return await new Promise<Float32Array>((resolve, reject) => {
    const child = spawn(
      ffmpegCommand,
      [
        "-hide_banner",
        "-loglevel",
        "error",
        "-i",
        sourceUrl,
        "-t",
        String(ANALYSIS_SECONDS),
        "-vn",
        "-ac",
        "1",
        "-ar",
        String(SAMPLE_RATE),
        "-f",
        "s16le",
        "pipe:1",
      ],
      {
        stdio: ["ignore", "pipe", "pipe"],
      },
    );

    const chunks: Buffer[] = [];
    const errors: Buffer[] = [];
    let byteLength = 0;
    let finished = false;

    const timeout = setTimeout(() => {
      if (finished) return;
      finished = true;
      child.kill("SIGKILL");
      reject(new Error("Audio analysis timed out"));
    }, 25_000);

    child.stdout.on("data", (chunk: Buffer) => {
      byteLength += chunk.length;

      if (byteLength > MAX_PCM_BYTES) {
        child.kill("SIGKILL");
        return;
      }

      chunks.push(chunk);
    });

    child.stderr.on("data", (chunk: Buffer) => {
      errors.push(chunk);
    });

    child.on("error", (error) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);
      reject(error);
    });

    child.on("close", (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timeout);

      if (byteLength > MAX_PCM_BYTES) {
        reject(new Error("Decoded audio exceeded the analysis limit"));
        return;
      }

      if (code !== 0 || chunks.length === 0) {
        reject(
          new Error(
            Buffer.concat(errors).toString("utf8").trim() ||
              `FFmpeg exited with code ${code}`,
          ),
        );
        return;
      }

      const pcm = Buffer.concat(chunks);
      const sampleCount = Math.floor(pcm.length / 2);
      const samples = new Float32Array(sampleCount);

      for (let index = 0; index < sampleCount; index++) {
        samples[index] = pcm.readInt16LE(index * 2) / 32768;
      }

      resolve(samples);
    });
  });
}

function fftMagnitudes(frame: Float32Array) {
  const size = frame.length;
  const real = new Float64Array(size);
  const imaginary = new Float64Array(size);

  for (let index = 0; index < size; index++) {
    const window =
      0.5 - 0.5 * Math.cos((2 * Math.PI * index) / Math.max(1, size - 1));
    real[index] = frame[index] * window;
  }

  for (let index = 1, reversed = 0; index < size; index++) {
    let bit = size >> 1;

    for (; reversed & bit; bit >>= 1) {
      reversed ^= bit;
    }

    reversed ^= bit;

    if (index < reversed) {
      const temporary = real[index];
      real[index] = real[reversed];
      real[reversed] = temporary;
    }
  }

  for (let length = 2; length <= size; length <<= 1) {
    const angle = (-2 * Math.PI) / length;
    const wLengthReal = Math.cos(angle);
    const wLengthImaginary = Math.sin(angle);

    for (let offset = 0; offset < size; offset += length) {
      let wReal = 1;
      let wImaginary = 0;
      const half = length >> 1;

      for (let index = 0; index < half; index++) {
        const even = offset + index;
        const odd = even + half;
        const oddReal =
          real[odd] * wReal - imaginary[odd] * wImaginary;
        const oddImaginary =
          real[odd] * wImaginary + imaginary[odd] * wReal;

        real[odd] = real[even] - oddReal;
        imaginary[odd] = imaginary[even] - oddImaginary;
        real[even] += oddReal;
        imaginary[even] += oddImaginary;

        const nextWReal =
          wReal * wLengthReal - wImaginary * wLengthImaginary;
        wImaginary =
          wReal * wLengthImaginary + wImaginary * wLengthReal;
        wReal = nextWReal;
      }
    }
  }

  const magnitudes = new Float64Array(size / 2);

  for (let index = 0; index < magnitudes.length; index++) {
    magnitudes[index] = Math.hypot(real[index], imaginary[index]);
  }

  return magnitudes;
}

function frequencyToMel(frequency: number) {
  return 2595 * Math.log10(1 + frequency / 700);
}

function melToFrequency(mel: number) {
  return 700 * (Math.pow(10, mel / 2595) - 1);
}

function getMelBands(magnitudes: Float64Array) {
  const nyquist = SAMPLE_RATE / 2;
  const minimumMel = frequencyToMel(40);
  const maximumMel = frequencyToMel(nyquist);
  const points = Array.from({ length: MEL_BAND_COUNT + 2 }, (_, index) => {
    const mel =
      minimumMel +
      ((maximumMel - minimumMel) * index) / (MEL_BAND_COUNT + 1);
    return melToFrequency(mel);
  });

  const bands = new Array<number>(MEL_BAND_COUNT).fill(0);
  const binWidth = SAMPLE_RATE / FFT_SIZE;

  for (let band = 0; band < MEL_BAND_COUNT; band++) {
    const left = points[band];
    const center = points[band + 1];
    const right = points[band + 2];
    let energy = 0;

    for (let bin = 1; bin < magnitudes.length; bin++) {
      const frequency = bin * binWidth;
      if (frequency < left || frequency > right) continue;

      const weight =
        frequency <= center
          ? (frequency - left) / Math.max(center - left, 1)
          : (right - frequency) / Math.max(right - center, 1);

      energy += magnitudes[bin] * magnitudes[bin] * Math.max(0, weight);
    }

    bands[band] = Math.log1p(energy);
  }

  return bands;
}

function getMfcc(logMelBands: number[]) {
  return Array.from({ length: MFCC_COUNT }, (_, coefficient) => {
    let sum = 0;

    for (let band = 0; band < logMelBands.length; band++) {
      sum +=
        logMelBands[band] *
        Math.cos(
          (Math.PI * coefficient * (band + 0.5)) / logMelBands.length,
        );
    }

    return sum;
  });
}

function getChroma(magnitudes: Float64Array) {
  const chroma = new Array<number>(12).fill(0);
  const binWidth = SAMPLE_RATE / FFT_SIZE;

  for (let bin = 1; bin < magnitudes.length; bin++) {
    const frequency = bin * binWidth;
    if (frequency < 60 || frequency > 5000) continue;

    const midi = 69 + 12 * Math.log2(frequency / 440);
    const pitchClass = ((Math.round(midi) % 12) + 12) % 12;
    chroma[pitchClass] += magnitudes[bin] * magnitudes[bin];
  }

  const total = chroma.reduce((sum, value) => sum + value, 0);
  return total > 0 ? chroma.map((value) => value / total) : chroma;
}

function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values: number[], average = mean(values)) {
  if (values.length === 0) return 0;

  return Math.sqrt(
    values.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) /
      values.length,
  );
}

function normalizeDistribution(values: number[]) {
  const nonNegative = values.map((value) => Math.max(0, value));
  const total = nonNegative.reduce((sum, value) => sum + value, 0);
  return total > 0
    ? nonNegative.map((value) => value / total)
    : nonNegative;
}

function getRmsEnvelope(samples: Float32Array) {
  const blockSize = 512;
  const envelope: number[] = [];

  for (let start = 0; start < samples.length; start += blockSize) {
    const end = Math.min(samples.length, start + blockSize);
    let energy = 0;

    for (let index = start; index < end; index++) {
      energy += samples[index] * samples[index];
    }

    envelope.push(Math.sqrt(energy / Math.max(1, end - start)));
  }

  return envelope;
}

function estimateTempoFromEnvelope(envelope: number[]) {
  if (envelope.length < 32) return null;

  const average = mean(envelope);
  const centered = envelope.map((value) => value - average);
  const envelopeRate = SAMPLE_RATE / 512;
  let bestBpm = 0;
  let bestCorrelation = -Infinity;

  for (let bpm = 60; bpm <= 180; bpm++) {
    const lag = Math.max(1, Math.round((60 * envelopeRate) / bpm));
    let numerator = 0;
    let leftEnergy = 0;
    let rightEnergy = 0;

    for (let index = lag; index < centered.length; index++) {
      const left = centered[index];
      const right = centered[index - lag];
      numerator += left * right;
      leftEnergy += left * left;
      rightEnergy += right * right;
    }

    const denominator = Math.sqrt(leftEnergy * rightEnergy);
    const correlation = denominator > 0 ? numerator / denominator : 0;

    if (correlation > bestCorrelation) {
      bestCorrelation = correlation;
      bestBpm = bpm;
    }
  }

  return bestCorrelation > 0.08 ? bestBpm : null;
}

function analyzePcm(samples: Float32Array): AudioSimilarityFeatures {
  if (samples.length < FFT_SIZE) {
    throw new Error("Audio preview is too short to analyze");
  }

  const spectralBandFrames: number[][] = [];
  const mfccFrames: number[][] = [];
  const chromaTotal = new Array<number>(12).fill(0);
  const centroids: number[] = [];
  const rolloffs: number[] = [];
  const flatnessValues: number[] = [];
  const nyquist = SAMPLE_RATE / 2;

  for (let frameIndex = 0; frameIndex < SPECTRAL_FRAME_COUNT; frameIndex++) {
    const progress =
      SPECTRAL_FRAME_COUNT === 1
        ? 0
        : frameIndex / (SPECTRAL_FRAME_COUNT - 1);
    const start = Math.min(
      samples.length - FFT_SIZE,
      Math.round(progress * (samples.length - FFT_SIZE)),
    );
    const frame = samples.slice(start, start + FFT_SIZE);
    const magnitudes = fftMagnitudes(frame);
    const magnitudeTotal = Array.from(magnitudes).reduce(
      (sum, value) => sum + value,
      0,
    );
    const powerTotal = Array.from(magnitudes).reduce(
      (sum, value) => sum + value * value,
      0,
    );

    const melBands = getMelBands(magnitudes);
    spectralBandFrames.push(normalizeDistribution(melBands.map(Math.expm1)));
    mfccFrames.push(getMfcc(melBands));

    const chroma = getChroma(magnitudes);
    chroma.forEach((value, index) => {
      chromaTotal[index] += value;
    });

    let weightedFrequency = 0;
    let cumulativePower = 0;
    let rolloffFrequency = 0;
    let logMagnitudeSum = 0;

    for (let bin = 1; bin < magnitudes.length; bin++) {
      const magnitude = magnitudes[bin];
      const frequency = (bin * SAMPLE_RATE) / FFT_SIZE;
      weightedFrequency += frequency * magnitude;
      logMagnitudeSum += Math.log(Math.max(magnitude, 1e-12));
    }

    const centroid =
      magnitudeTotal > 0 ? weightedFrequency / magnitudeTotal : 0;
    centroids.push(clamp01(centroid / nyquist));

    const targetPower = powerTotal * 0.85;
    for (let bin = 1; bin < magnitudes.length; bin++) {
      cumulativePower += magnitudes[bin] * magnitudes[bin];
      if (cumulativePower >= targetPower) {
        rolloffFrequency = (bin * SAMPLE_RATE) / FFT_SIZE;
        break;
      }
    }
    rolloffs.push(clamp01(rolloffFrequency / nyquist));

    const binCount = Math.max(1, magnitudes.length - 1);
    const arithmeticMean =
      magnitudeTotal / Math.max(1, magnitudes.length);
    const geometricMean = Math.exp(logMagnitudeSum / binCount);
    flatnessValues.push(
      arithmeticMean > 0 ? clamp01(geometricMean / arithmeticMean) : 0,
    );

  }

  const spectralBands = Array.from({ length: MEL_BAND_COUNT }, (_, index) =>
    mean(spectralBandFrames.map((frame) => frame[index] ?? 0)),
  );
  const mfccMean = Array.from({ length: MFCC_COUNT }, (_, index) =>
    mean(mfccFrames.map((frame) => frame[index] ?? 0)),
  );
  const mfccStd = Array.from({ length: MFCC_COUNT }, (_, index) =>
    standardDeviation(
      mfccFrames.map((frame) => frame[index] ?? 0),
      mfccMean[index],
    ),
  );

  const rmsEnvelope = getRmsEnvelope(samples);
  const rmsAverage = mean(rmsEnvelope);
  const rmsStd = standardDeviation(rmsEnvelope, rmsAverage);
  const positiveChanges = rmsEnvelope
    .slice(1)
    .map((value, index) => Math.max(0, value - rmsEnvelope[index]));
  const onsetDensity =
    rmsAverage > 0 ? clamp01(mean(positiveChanges) / rmsAverage * 8) : 0;

  return {
    spectralBands: normalizeDistribution(spectralBands),
    mfccMean,
    mfccStd,
    chroma: normalizeDistribution(chromaTotal),
    centroidMean: mean(centroids),
    centroidStd: standardDeviation(centroids),
    rolloffMean: mean(rolloffs),
    rolloffStd: standardDeviation(rolloffs),
    flatnessMean: mean(flatnessValues),
    flatnessStd: standardDeviation(flatnessValues),
    rmsMean: rmsAverage,
    rmsStd,
    onsetDensity,
    estimatedBpm: estimateTempoFromEnvelope(rmsEnvelope),
  };
}

export async function analyzeAudioUrl(sourceUrl: string) {
  const cleanUrl = sourceUrl.trim();
  if (!cleanUrl) throw new Error("Audio URL is required");

  const cached = featureCache.get(cleanUrl);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.features;
  }

  const samples = await decodeAudioToPcm(cleanUrl);
  const features = analyzePcm(samples);

  featureCache.set(cleanUrl, {
    expiresAt: Date.now() + CACHE_TTL_MS,
    features,
  });

  return features;
}

function cosineSimilarity(left: number[], right: number[]) {
  const length = Math.min(left.length, right.length);
  if (length === 0) return 0;

  let dot = 0;
  let leftEnergy = 0;
  let rightEnergy = 0;

  for (let index = 0; index < length; index++) {
    dot += left[index] * right[index];
    leftEnergy += left[index] * left[index];
    rightEnergy += right[index] * right[index];
  }

  const denominator = Math.sqrt(leftEnergy * rightEnergy);
  if (denominator <= 0) return 0;

  return clamp01((dot / denominator + 1) / 2);
}

function bestChromaSimilarity(left: number[], right: number[]) {
  let best = 0;

  for (let shift = 0; shift < 12; shift++) {
    const shifted = right.map(
      (_, index) => right[(index + shift) % right.length] ?? 0,
    );
    best = Math.max(best, cosineSimilarity(left, shifted));
  }

  return best;
}

function scalarSimilarity(left: number, right: number, scale: number) {
  return Math.exp(-Math.abs(left - right) / Math.max(scale, 1e-6));
}

function tempoSimilarity(
  referenceBpm: number | null,
  candidateBpm: number | null,
) {
  if (!referenceBpm || !candidateBpm) return null;

  const distances = [
    Math.abs(referenceBpm - candidateBpm),
    Math.abs(referenceBpm * 2 - candidateBpm),
    Math.abs(referenceBpm - candidateBpm * 2),
  ];

  return clamp01(1 - Math.min(...distances) / 24);
}

export function compareAudioFeatures(
  reference: AudioSimilarityFeatures,
  candidate: AudioSimilarityFeatures,
  options: {
    referenceBpm?: number | null;
    candidateBpm?: number | null;
  } = {},
) {
  const referenceBpm =
    options.referenceBpm ?? reference.estimatedBpm ?? null;
  const candidateBpm =
    options.candidateBpm ?? candidate.estimatedBpm ?? null;
  const tempo = tempoSimilarity(referenceBpm, candidateBpm);

  const signals = [
    {
      score: cosineSimilarity(reference.spectralBands, candidate.spectralBands),
      weight: 0.28,
    },
    {
      score: cosineSimilarity(
        reference.mfccMean.slice(1),
        candidate.mfccMean.slice(1),
      ),
      weight: 0.18,
    },
    {
      score: cosineSimilarity(
        reference.mfccStd.slice(1),
        candidate.mfccStd.slice(1),
      ),
      weight: 0.08,
    },
    {
      score: bestChromaSimilarity(reference.chroma, candidate.chroma),
      weight: 0.1,
    },
    {
      score: scalarSimilarity(
        reference.centroidMean,
        candidate.centroidMean,
        0.18,
      ),
      weight: 0.08,
    },
    {
      score: scalarSimilarity(
        reference.rolloffMean,
        candidate.rolloffMean,
        0.18,
      ),
      weight: 0.06,
    },
    {
      score: scalarSimilarity(
        reference.flatnessMean,
        candidate.flatnessMean,
        0.16,
      ),
      weight: 0.05,
    },
    {
      score: scalarSimilarity(reference.rmsStd, candidate.rmsStd, 0.08),
      weight: 0.05,
    },
    {
      score: scalarSimilarity(
        reference.onsetDensity,
        candidate.onsetDensity,
        0.2,
      ),
      weight: 0.06,
    },
    ...(tempo === null ? [] : [{ score: tempo, weight: 0.06 }]),
  ];

  const totalWeight = signals.reduce(
    (sum, signal) => sum + signal.weight,
    0,
  );
  const score = signals.reduce(
    (sum, signal) => sum + signal.score * signal.weight,
    0,
  );

  return totalWeight > 0 ? score / totalWeight : 0;
}
