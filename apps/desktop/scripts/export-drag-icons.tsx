// @ts-nocheck

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import FolderIcon from "../src/components/icons/FolderIcon";
import MusicIcon from "../src/components/icons/MusicIcon";

const outputDir = path.resolve("apps/desktop/src-tauri/icons");

function normalizeSvg(svg: string) {
  return svg
    .replace(/<svg([^>]*)>/, '<svg$1 width="96" height="96">')
    .replace(/currentColor/g, "#5C5C5A");
}

async function exportIcon(name: string, element: React.ReactElement) {
  const rawSvg = renderToStaticMarkup(element);
  const svg = normalizeSvg(rawSvg);

  await sharp(Buffer.from(svg))
    .resize(96, 96, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(path.join(outputDir, name));
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  await exportIcon("drag-folder.png", <FolderIcon />);
  await exportIcon("drag-file.png", <MusicIcon />);

  console.log("Exported drag icon PNGs.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
