import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { uploadFileToR2 } from "@/lib/r2";

const execFileAsync = promisify(execFile);

type ProcessAudioForStreamingArgs = {
  file: File;
  baseKey: string;
};

type HlsAsset = {
  key: string;
  url: string;
};

export type ProcessedAudioAssets = {
  playbackUrl: string;
  playbackKey: string;
  hlsUrl: string;
  hlsKey: string;
  hlsAssetKeys: string[];
  hlsAssets: HlsAsset[];
};

function assertFfmpegPath() {
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static did not resolve a binary path.");
  }

  return ffmpegPath;
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
  await execFileAsync(assertFfmpegPath(), args, {
    maxBuffer: 1024 * 1024 * 20,
  });
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

    await runFfmpeg([
      "-y",
      "-i",
      inputPath,
      "-vn",
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
