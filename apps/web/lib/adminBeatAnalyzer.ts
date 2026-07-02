export type AdminBeatAnalyzerResult = {
  enabled: boolean;
  bpm: number | null;
  confidence: number | null;
  beats: number[];
  downbeats: number[];
  source: string;
};

export async function analyzeBeatsForAdminUpload(file: File) {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/admin/analyze-beats", {
      method: "POST",
      body: formData,
    });

    const data = (await response.json()) as Partial<AdminBeatAnalyzerResult>;

    if (!response.ok || !data.enabled || !data.bpm) {
      return null;
    }

    return {
      enabled: true,
      bpm: Number.isFinite(Number(data.bpm)) ? Number(data.bpm) : null,
      confidence: Number.isFinite(Number(data.confidence))
        ? Number(data.confidence)
        : null,
      beats: Array.isArray(data.beats)
        ? data.beats.map(Number).filter(Number.isFinite)
        : [],
      downbeats: Array.isArray(data.downbeats)
        ? data.downbeats.map(Number).filter(Number.isFinite)
        : [],
      source: typeof data.source === "string" ? data.source : "beat_this",
    } satisfies AdminBeatAnalyzerResult;
  } catch {
    return null;
  }
}
