type EssentiaInstance = {
  arrayToVector: (input: Float32Array | number[]) => unknown
  RhythmExtractor2013: (audio: unknown) => {
    bpm?: number
    ticks?: number[]
    confidence?: number
  }
  KeyExtractor: (
    audio: unknown,
    averageDetuningCorrection?: boolean,
    frameSize?: number,
    hopSize?: number,
    hpcpSize?: number,
    maxFrequency?: number,
    maximumSpectralPeaks?: number,
    minFrequency?: number,
    pcpThreshold?: number,
    profileType?: string,
    sampleRate?: number,
    spectralPeaksThreshold?: number,
    tuningFrequency?: number,
    weightType?: string,
    windowType?: string
  ) => {
    key?: string
    scale?: string
    strength?: number
  }
}

type BeatAnalyzerResponse = {
  enabled?: boolean
  bpm?: number | null
  confidence?: number | null
  beats?: number[]
  downbeats?: number[]
  source?: string
  error?: string
}

type EssentiaConstructor = new (wasmModule: unknown) => EssentiaInstance

type EssentiaWasmLoader = unknown | (() => Promise<unknown>)

declare global {
  interface Window {
    Essentia?: EssentiaConstructor
    EssentiaWASM?: EssentiaWasmLoader
    __FILMWAVE_LAST_BPM_ANALYSIS__?: {
      source: 'beat_this' | 'essentia' | 'fallback'
      bpm: number | null
      message: string
    }
  }
}

let essentiaPromise: Promise<EssentiaInstance> | null = null

function setLastBpmAnalysis(
  source: 'beat_this' | 'essentia' | 'fallback',
  bpm: number | null,
  message: string
) {
  window.__FILMWAVE_LAST_BPM_ANALYSIS__ = {
    source,
    bpm,
    message,
  }

  if (source === 'beat_this') {
    console.info(`[Filmwave BPM] Beat-This returned ${bpm} BPM.`)
  } else {
    console.info(`[Filmwave BPM] ${message}`)
  }
}

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(`script[src="${src}"]`)

    if (existingScript) {
      resolve()
      return
    }

    const script = document.createElement('script')
    script.src = src
    script.async = false

    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))

    document.head.appendChild(script)
  })
}

async function resolveEssentiaWasm() {
  const wasm = window.EssentiaWASM

  if (!wasm) {
    throw new Error('Essentia WASM failed to load.')
  }

  if (typeof wasm === 'function') {
    return await wasm()
  }

  return wasm
}

async function getEssentia() {
  if (!essentiaPromise) {
    essentiaPromise = Promise.all([
      loadScript('/essentia-wasm.web.js'),
      loadScript('/essentia.js-core.js'),
    ]).then(async () => {
      if (!window.Essentia) {
        throw new Error('Essentia core failed to load.')
      }

      const wasmModule = await resolveEssentiaWasm()

      return new window.Essentia(wasmModule)
    })
  }

  return essentiaPromise
}

function writeAscii(view: DataView, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i))
  }
}

function audioBufferToWavFile(audioBuffer: AudioBuffer) {
  const channelCount = audioBuffer.numberOfChannels
  const sampleRate = audioBuffer.sampleRate
  const sampleCount = audioBuffer.length
  const bytesPerSample = 2
  const blockAlign = channelCount * bytesPerSample
  const dataByteLength = sampleCount * blockAlign
  const buffer = new ArrayBuffer(44 + dataByteLength)
  const view = new DataView(buffer)

  writeAscii(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataByteLength, true)
  writeAscii(view, 8, 'WAVE')
  writeAscii(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channelCount, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * blockAlign, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bytesPerSample * 8, true)
  writeAscii(view, 36, 'data')
  view.setUint32(40, dataByteLength, true)

  let offset = 44

  for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex++) {
    for (let channelIndex = 0; channelIndex < channelCount; channelIndex++) {
      const channelData = audioBuffer.getChannelData(channelIndex)
      const sample = Math.max(-1, Math.min(1, channelData[sampleIndex] || 0))
      const pcmSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff

      view.setInt16(offset, pcmSample, true)
      offset += bytesPerSample
    }
  }

  return new File([buffer], 'beat-this-analysis.wav', {
    type: 'audio/wav',
  })
}

async function estimateBpmWithBeatAnalyzer(audioBuffer: AudioBuffer) {
  try {
    console.info('[Filmwave BPM] Calling Beat-This analyzer...')

    const formData = new FormData()
    formData.append('file', audioBufferToWavFile(audioBuffer))

    const response = await fetch('/api/admin/analyze-beats', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })

    let data: BeatAnalyzerResponse | null = null

    try {
      data = (await response.json()) as BeatAnalyzerResponse
    } catch {
      data = null
    }

    if (!response.ok) {
      console.warn('[Filmwave BPM] Beat-This route failed.', {
        status: response.status,
        data,
      })
      setLastBpmAnalysis(
        'fallback',
        null,
        `Beat-This route failed with status ${response.status}; falling back to Essentia.`
      )
      return null
    }

    const bpm = Number(data?.bpm)

    if (!data?.enabled || !Number.isFinite(bpm) || bpm <= 0) {
      console.warn('[Filmwave BPM] Beat-This returned no usable BPM.', data)
      setLastBpmAnalysis(
        'fallback',
        null,
        'Beat-This returned no usable BPM; falling back to Essentia.'
      )
      return null
    }

    const roundedBpm = Math.round(bpm)
    setLastBpmAnalysis('beat_this', roundedBpm, `Beat-This returned ${roundedBpm} BPM.`)

    return roundedBpm
  } catch (error) {
    console.warn('[Filmwave BPM] Beat-This request failed.', error)
    setLastBpmAnalysis(
      'fallback',
      null,
      'Beat-This request failed; falling back to Essentia.'
    )
    return null
  }
}

function formatEssentiaKey(key: string, scale: string) {
  const normalizedKey = key.trim()
  const normalizedScale = scale.trim().toLowerCase()

  if (!normalizedKey) return null

  if (normalizedScale === 'major') {
    return `${normalizedKey}maj`
  }

  if (normalizedScale === 'minor') {
    return `${normalizedKey}min`
  }

  return null
}

export async function estimateBpmWithEssentia(audioBuffer: AudioBuffer) {
  const beatAnalyzerBpm = await estimateBpmWithBeatAnalyzer(audioBuffer)

  if (beatAnalyzerBpm) {
    return beatAnalyzerBpm
  }

  const essentia = await getEssentia()
  const channelData = audioBuffer.getChannelData(0)
  const audioVector = essentia.arrayToVector(channelData)

  const result = essentia.RhythmExtractor2013(audioVector)

  if (!result?.bpm || !Number.isFinite(result.bpm)) {
    setLastBpmAnalysis('essentia', null, 'Essentia returned no usable BPM.')
    return null
  }

  const roundedBpm = Math.round(result.bpm)
  setLastBpmAnalysis('essentia', roundedBpm, `Essentia returned ${roundedBpm} BPM.`)

  return roundedBpm
}

export async function estimateKeyWithEssentia(audioBuffer: AudioBuffer) {
  const essentia = await getEssentia()
  const channelData = audioBuffer.getChannelData(0)
  const audioVector = essentia.arrayToVector(channelData)

  const result = essentia.KeyExtractor(
    audioVector,
    true,
    4096,
    4096,
    12,
    3500,
    60,
    25,
    0.2,
    'bgate',
    audioBuffer.sampleRate,
    0.0001,
    440,
    'cosine',
    'hann'
  )

  if (!result?.key || !result?.scale) {
    return null
  }

  return {
    key: formatEssentiaKey(result.key, result.scale),
    rawKey: result.key,
    scale: result.scale,
    strength: result.strength ?? null,
  }
}
