import {
  estimateBpmWithEssentia,
  estimateKeyWithEssentia,
} from "@/lib/essentiaAnalysis";

type OnsetAnalysis = {
  envelope: number[];
  sampleRate: number;
  hopSize: number;
};

type BeatAnalyzerResponse = {
  enabled?: boolean;
  bpm?: number | null;
  confidence?: number | null;
  beats?: number[];
  downbeats?: number[];
  source?: string;
  error?: string;
};

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function audioBufferToWavFile(audioBuffer: AudioBuffer) {
  const channelCount = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const sampleCount = audioBuffer.length;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const dataByteLength = sampleCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataByteLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataByteLength, true);

  let offset = 44;

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex++) {
      const channelData = audioBuffer.getChannelData(channelIndex);
      const sample = Math.max(-1, Math.min(1, channelData[sampleIndex] || 0));
      const pcmSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;

      view.setInt16(offset, pcmSample, true);
      offset += bytesPerSample;
    }
  }

  return new File([buffer], "beat-this-analysis.wav", {
    type: "audio/wav",
  });
}

async function estimateArtistBpm(audioBuffer: AudioBuffer, artistId: string) {
  try {
    const formData = new FormData();
    formData.append("file", audioBufferToWavFile(audioBuffer));

    const response = await fetch(`/api/artists/${artistId}/analyze-beats`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });

    const data = (await response.json().catch(() => null)) as BeatAnalyzerResponse | null;
    const bpm = Number(data?.bpm);

    if (response.ok && data?.enabled && Number.isFinite(bpm) && bpm > 0) {
      return Math.round(bpm);
    }
  } catch (error) {
    console.warn("[Artist BPM] Beat analyzer request failed.", error);
  }

  return estimateBpmWithEssentia(audioBuffer);
}

function downsamplePeaks(peaks: number[], targetLength = 300) {
  if (peaks.length <= targetLength) {
    return peaks;
  }

  const downsampled: number[] = [];
  const blockSize = Math.floor(peaks.length / targetLength);

  for (let i = 0; i < targetLength; i++) {
    const start = i * blockSize;
    const end = start + blockSize;
    let max = 0;

    for (let j = start; j < end && j < peaks.length; j++) {
      const abs = Math.abs(peaks[j]);

      if (abs > Math.abs(max)) {
        max = peaks[j];
      }
    }

    downsampled.push(Number(max.toFixed(6)));
  }

  return downsampled;
}

function normalizeObviousDoubleTimeBpm(rawBpm: number | null) {
  if (!rawBpm) return null;

  if (rawBpm > 140) {
    return Math.round(rawBpm / 2);
  }

  return Math.round(rawBpm);
}

function createOnsetEnvelope(audioBuffer: AudioBuffer): OnsetAnalysis {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  const frameSize = 2048;
  const hopSize = 512;
  const energies: number[] = [];

  for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
    let energy = 0;

    for (let j = 0; j < frameSize; j++) {
      const sample = channelData[i + j];
      energy += sample * sample;
    }

    energies.push(Math.sqrt(energy / frameSize));
  }

  const envelope: number[] = [];

  for (let i = 1; i < energies.length; i++) {
    const diff = energies[i] - energies[i - 1];
    envelope.push(diff > 0 ? diff : 0);
  }

  const sorted = [...envelope].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] || 0;
  const max = Math.max(...envelope, 1);

  const cleaned = envelope.map((value) => {
    const reduced = Math.max(0, value - median);
    return reduced / max;
  });

  return {
    envelope: cleaned,
    sampleRate,
    hopSize,
  };
}

function estimateBpmFromOnsets(audioBuffer: AudioBuffer) {
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  const frameSize = 1024;
  const hopSize = 512;
  const energies: number[] = [];

  for (let i = 0; i < channelData.length - frameSize; i += hopSize) {
    let energy = 0;

    for (let j = 0; j < frameSize; j++) {
      const sample = channelData[i + j];
      energy += sample * sample;
    }

    energies.push(energy / frameSize);
  }

  const onsets: number[] = [];

  for (let i = 1; i < energies.length; i++) {
    const diff = energies[i] - energies[i - 1];
    onsets.push(diff > 0 ? diff : 0);
  }

  const averageOnset =
    onsets.reduce((sum, value) => sum + value, 0) / Math.max(1, onsets.length);

  const threshold = averageOnset * 1.8;
  const onsetTimes: number[] = [];

  for (let i = 0; i < onsets.length; i++) {
    if (onsets[i] > threshold) {
      const time = (i * hopSize) / sampleRate;
      const previousTime = onsetTimes[onsetTimes.length - 1];

      if (!previousTime || time - previousTime > 0.18) {
        onsetTimes.push(time);
      }
    }
  }

  if (onsetTimes.length < 4) return null;

  const intervals: number[] = [];

  for (let i = 1; i < onsetTimes.length; i++) {
    const interval = onsetTimes[i] - onsetTimes[i - 1];

    if (interval > 0.25 && interval < 2) {
      intervals.push(interval);
    }
  }

  if (!intervals.length) return null;

  const bpmCandidates = intervals
    .map((interval) => 60 / interval)
    .map((bpm) => {
      let normalized = bpm;

      while (normalized < 70) normalized *= 2;
      while (normalized > 180) normalized /= 2;

      return Math.round(normalized);
    });

  const counts = new Map<number, number>();

  for (const bpm of bpmCandidates) {
    counts.set(bpm, (counts.get(bpm) || 0) + 1);
  }

  let bestBpm: number | null = null;
  let bestCount = 0;

  for (const [bpm, count] of counts.entries()) {
    if (count > bestCount) {
      bestBpm = bpm;
      bestCount = count;
    }
  }

  return bestBpm;
}

function scoreBpmAgainstEnvelope(bpm: number, analysis: OnsetAnalysis) {
  const { envelope, sampleRate, hopSize } = analysis;
  const lag = Math.round(((60 / bpm) * sampleRate) / hopSize);

  if (lag < 2 || lag >= envelope.length) return 0;

  const start = Math.floor(envelope.length * 0.05);
  const end = Math.floor(envelope.length * 0.95);

  let score = 0;
  let count = 0;

  for (let i = start + lag; i < end; i++) {
    score += envelope[i] * envelope[i - lag];
    count++;
  }

  const halfLag = lag * 2;

  if (halfLag < envelope.length) {
    for (let i = start + halfLag; i < end; i++) {
      score += 0.45 * envelope[i] * envelope[i - halfLag];
      count++;
    }
  }

  const thirdLag = lag * 3;

  if (thirdLag < envelope.length) {
    for (let i = start + thirdLag; i < end; i++) {
      score += 0.25 * envelope[i] * envelope[i - thirdLag];
      count++;
    }
  }

  return count > 0 ? score / count : 0;
}

function proximityBonus(candidate: number, target: number | null, radius = 3) {
  if (!target) return 0;

  const distance = Math.abs(candidate - target);

  if (distance > radius) return 0;

  return (radius - distance) / radius;
}

function estimateBpmFromAutocorrelation(audioBuffer: AudioBuffer) {
  const analysis = createOnsetEnvelope(audioBuffer);

  let bestBpm: number | null = null;
  let bestScore = 0;

  for (let bpm = 55; bpm <= 180; bpm++) {
    const score = scoreBpmAgainstEnvelope(bpm, analysis);

    if (score > bestScore) {
      bestScore = score;
      bestBpm = bpm;
    }
  }

  if (!bestBpm) {
    return {
      bpm: null,
      score: 0,
    };
  }

  let refinedBpm = bestBpm;
  let refinedScore = bestScore;

  const fineStart = Math.max(55, bestBpm - 4);
  const fineEnd = Math.min(180, bestBpm + 4);

  for (let bpm = fineStart; bpm <= fineEnd; bpm += 0.1) {
    const candidate = Number(bpm.toFixed(1));
    const score = scoreBpmAgainstEnvelope(candidate, analysis);

    if (score > refinedScore) {
      refinedBpm = candidate;
      refinedScore = score;
    }
  }

  const candidates = [refinedBpm, refinedBpm / 2, refinedBpm * 2]
    .filter((value) => value >= 55 && value <= 180)
    .map((value) => Number(value.toFixed(1)));

  for (const candidate of candidates) {
    const score = scoreBpmAgainstEnvelope(candidate, analysis);

    if (score > refinedScore) {
      refinedBpm = candidate;
      refinedScore = score;
    }
  }

  return {
    bpm: Math.round(refinedBpm),
    score: refinedScore,
  };
}

function chooseSuggestedBpm({
  autocorrBpm,
  normalizedEssentiaBpm,
  onsetBpm,
  audioBuffer,
}: {
  autocorrBpm: number | null;
  normalizedEssentiaBpm: number | null;
  onsetBpm: number | null;
  audioBuffer: AudioBuffer;
}) {
  const analysis = createOnsetEnvelope(audioBuffer);
  const candidateSet = new Set<number>();

  const addCandidateRange = (base: number | null) => {
    if (!base) return;

    for (let offset = -3; offset <= 3; offset++) {
      const candidate = base + offset;

      if (candidate >= 55 && candidate <= 180) {
        candidateSet.add(candidate);
      }
    }
  };

  addCandidateRange(autocorrBpm);
  addCandidateRange(normalizedEssentiaBpm);
  addCandidateRange(onsetBpm);

  if (!candidateSet.size) return null;

  let bestCandidate: number | null = null;
  let bestScore = -Infinity;

  for (const candidate of candidateSet) {
    const envelopeScore = scoreBpmAgainstEnvelope(candidate, analysis);
    const consensusScore =
      proximityBonus(candidate, autocorrBpm, 3) * 0.4 +
      proximityBonus(candidate, normalizedEssentiaBpm, 3) * 0.25 +
      proximityBonus(candidate, onsetBpm, 3) * 0.2;

    const score = envelopeScore + consensusScore;

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

export async function analyzeArtistSongAudioFile(
  file: File,
  artistId: string,
  targetLength = 1500,
) {
  const arrayBuffer = await file.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  const channelData = audioBuffer.getChannelData(0);
  const fullPeaks = Array.from(channelData);
  const optimizedPeaks = downsamplePeaks(fullPeaks, targetLength);

  const essentiaBpm = await estimateArtistBpm(audioBuffer, artistId);
  const keyResult = await estimateKeyWithEssentia(audioBuffer);
  const normalizedEssentiaBpm = normalizeObviousDoubleTimeBpm(essentiaBpm);
  const onsetBpm = estimateBpmFromOnsets(audioBuffer);
  const autocorrResult = estimateBpmFromAutocorrelation(audioBuffer);
  const autocorrBpm = autocorrResult.bpm;

  const bpm = chooseSuggestedBpm({
    autocorrBpm,
    normalizedEssentiaBpm,
    onsetBpm,
    audioBuffer,
  });

  await audioContext.close();

  return {
    peaksJson: JSON.stringify(optimizedPeaks),
    duration: audioBuffer.duration,
    peakCount: optimizedPeaks.length,
    originalCount: fullPeaks.length,
    bpm,
    essentiaBpm,
    normalizedEssentiaBpm,
    onsetBpm,
    autocorrBpm,
    autocorrScore: autocorrResult.score,
    detectedKey: keyResult?.key ?? null,
    detectedKeyRaw: keyResult?.rawKey ?? null,
    detectedScale: keyResult?.scale ?? null,
    detectedKeyStrength: keyResult?.strength ?? null,
  };
}
