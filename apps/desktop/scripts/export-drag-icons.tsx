import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve(process.cwd(), "src-tauri/icons");

const folderSvg = `
<svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 7.5C4 6.67157 4.67157 6 5.5 6H9.4L11.1 8H18.5C19.3284 8 20 8.67157 20 9.5V17.5C20