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

type EssentiaConstructor = new (wasmModule: unknown) => EssentiaInstance

type EssentiaWasmLoader = unknown | (() => Promise<unknown>)

declare global {
  interface Window {
    Essentia?: EssentiaConstructor
    EssentiaWASM?: EssentiaWasmLoader
  }
}

let essentiaPromise: Promise<EssentiaInstance> | null = null

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
  const essentia = await getEssentia()
  const channelData = audioBuffer.getChannelData(0)
  const audioVector = essentia.arrayToVector(channelData)

  const result = essentia.RhythmExtractor2013(audioVector)

  if (!result?.bpm || !Number.isFinite(result.bpm)) {
    return null
  }

  return Math.round(result.bpm)
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