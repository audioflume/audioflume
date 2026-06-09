import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.resolve(scriptDir, "../src-tauri/icons");
const size = 128;

const COLORS = {
  folder: [109, 109, 104, 255],
  folderDark: [82, 82, 78, 255],
  folderShadow: [35