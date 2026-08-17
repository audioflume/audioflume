import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { uploadFileToR2 } from "@/lib/r2";

const execFileAsync = promisify(execFile);
const FFMPEG_EXECUTABLE_NAME = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
const TARGET_INTEGRATED_LUFS = -14;
const TARGET_TRUE_PEAK_DBTP = -1;
const TARGET_LOUDNESS_RANGE = 11;

let resolvedFfmpegPath: string | null = null;

type ProcessAudioForStreamingArgs = {
  file: File;
  baseKey: string;
};

type HlsAsset = {
  key: string;
  url: string;
};

type LoudnessMeasurement = {
  inputI: number;
  inputTp: number;
  inputLra: number;
  inputThresh: number;
  targetOffset: number;
};

export type ProcessedAudioAssets = {
  playbackUrl: string;
  playbackKey: string;
  hlsUrl: string;
  hlsKey: string;
  hlsAssetKeys: string[];
  hlsAssets: HlsAsset[];
};

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
    path.join(process.cwd(), "node_modules", "ffmpeg-static", FFMPEG_EXECUTABLE_NAME),
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

function getFileExtension(fileName: string) {
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "";
  return extension ? `.${extension.toLowerCase()}` : ".audio";
}

function makeFile(parts: BlobPart[], fileName: string, type: string) {
  return new File(parts, fileName, { type });
}

function getHlsContentType(fileName: string) {
  if (fileName.endsWith(".m3u8")) return "application/vnd.apple.mpegurl";
  if (fileName.endsWith(".mp4") || fileName.endsWith(".m4s")) return "audio/mp4";
  return "application/octet-stream";
}

async function runFfmpeg(args: string[]) {
  const ffmpegCommand = await resolveFfmpegPath();

  try {
    return await execFileAsync(ffmpegCommand, args, {
      maxBuffer: 1024 * 1024 * 20,
    });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      throw new Error(
        `FFmpeg binary was not found. Tried ${ffmpegCommand}. Reinstall dependencies or set FFMPEG_PATH to a valid ffmpeg binary.`,
      );
    }

    throw error;
  }
}

function parseLoudnessMeasurement(stderr: string): LoudnessMeasurement {
  const jsonMatch = stderr.match(/\{\s*"input_i"[\s\S]*?\}/);

  if (!jsonMatch) {
    throw new Error("FFmpeg did not return loudness analysis data.");
  }

  const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>;
  const measurement: LoudnessMeasurement = {
    inputI: Number(parsed.input_i),
    inputTp: Number(parsed.input_tp),
    inputLra: Number(parsed.input_lra),
    inputThresh: Number(parsed.input_thresh),
    targetOffset: Number(parsed.target_offset),
  };

  if (Object.values(measurement).some((value) => !Number.isFinite(value))) {
    throw new Error("FFmpeg could not measure the uploaded audio loudness.");
  }

  return measurement;
}

async function getLoudnessNormalizationFilter(inputPath: string) {
  const { stderr } = await runFfmpeg([
    "-hide_banner",
    "-i",
    inputPath,
    "-vn",
    "-af",
    `loudnorm=I=${TARGET_INTEGRATED_LUFS}:TP=${TARGET_TRUE_PEAK_DBTP}:LRA=${TARGET_LOUDNESS_RANGE}:print_format=json`,
    "-f",
    "null",
    "-",
  ]);

  const measurement = parseLoudnessMeasurement(stderr);

  return [
    `loudnorm=I=${TARGET_INTEGRATED_LUFS}`,
    `TP=${TARGET_TRUE_PEAK_DBTP}`,
    `LRA=${TARGET_LOUDNESS_RANGE}`,
    `measured_I=${measurement.inputI}`,
    `measured_TP=${measurement.inputTp}`,
    `measured_LRA=${measurement.inputLra}`,
    `measured_thresh=${measurement.inputThresh}`,
    `offset=${measurement.targetOffset}`,
    "linear=true",
  ].join(":");
}

export async function processAudioForStreaming({
  file,
  baseKey,
}: ProcessAudioForStreamingArgs): Promise<ProcessedAudioAssets> {
  const tempDir = await mkdtemp(path.join(tmpdir(), "filmwave-audio-"));

  try {
    const inputPath = path.join(tempDir, `source${getFileExtension(file.name)}`);
    const previewPath = path.join(tempDir, "preview.mp3");
    const hlsDir = path.join(tempDir, "hls");
    const hlsManifestPath = path.join(hlsDir, "index.m3u8");

    await writeFile(inputPath, Buffer.from(await file.arrayBuffer()));
    await mkdtemp(`${hlsDir}-`);
    await rm(hlsDir, { force: true, recursive: true });
    await import("node:fs/promises").then(({ mkdir }) => mkdir(hlsDir, { recursive: true }));

    const loudnessNormalizationFilter = await getLoudnessNormalizationFilter(inputPath);

    await runFfmpeg([
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-af",
      loudnessNormalizationFilter,
      "-ar",
      "48000",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "320k",
      "-write_xing",
      "1",
      previewPath,
    ]);

    await runFfmpeg([
      "-y",
      "-i",
      inputPath,
      "-vn",
      "-af",
      loudnessNormalizationFilter,
      "-ar",
      "48000",
      "-codec:a",
      "aac",
      "-b:a",
      "192k",
      "-hls_time",
      "6",
      "-hls_playlist_type",
      "vod",
      "-hls_segment_type",
      "fmp4",
      "-hls_fmp4_init_filename",
      "init.mp4",
      "-hls_segment_filename",
      path.join(hlsDir, "segment_%03d.m4s"),
      hlsManifestPath,
    ]);

    const cleanBaseKey = baseKey.replace(/^\/+|\/+$/g, "");
    const playbackKey = `${cleanBaseKey}/playback/preview.mp3`;
    const hlsBaseKey = `${cleanBaseKey}/hls`;
    const hlsKey = `${hlsBaseKey}/index.m3u8`;

    const playbackBuffer = await readFile(previewPath);
    const playbackUrl = await uploadFileToR2({
      file: makeFile([playbackBuffer], "preview.mp3", "audio/mpeg"),
      key: playbackKey,
    });

    const hlsFileNames = (await readdir(hlsDir)).sort((a, b) => {
      if (a === "index.m3u8") return 1;
      if (b === "index.m3u8") return -1;
      return a.localeCompare(b);
    });

    const hlsAssets: HlsAsset[] = [];
    let hlsUrl = "";

    for (const fileName of hlsFileNames) {
      const buffer = await readFile(path.join(hlsDir, fileName));
      const key = `${hlsBaseKey}/${fileName}`;
      const url = await uploadFileToR2({
        file: makeFile([buffer], fileName, getHlsContentType(fileName)),
        key,
      });

      hlsAssets.push({ key, url });

      if (fileName === "index.m3u8") {
        hlsUrl = url;
      }
    }

    if (!hlsUrl) {
      throw new Error("HLS manifest was not generated.");
    }

    return {
      playbackUrl,
      playbackKey,
      hlsUrl,
      hlsKey,
      hlsAssetKeys: hlsAssets.map((asset) => asset.key),
      hlsAssets,
    };
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
}
