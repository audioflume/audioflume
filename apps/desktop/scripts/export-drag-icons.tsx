import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const outputDir = path.resolve(process.cwd(), "src-tauri/icons");

const folderSvg = `
<svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M4 7.5C4 6.67157 4.67157 6 5.5 6H9.4L11.1 8H18.5C19.3284 8 20 8.67157 20 9.5V17.5C20 18.3284 19.3284 19 18.5 19H5.5C4.67157 19 4 18.3284 4 17.5V7.5Z" stroke="#5C5C5A" stroke-width="1.9" stroke-linejoin="round"/>
</svg>
`;

const fileSvg = `
<svg width="96" height="96" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 18.5C9 19.8807 7.65685 21 6 21C4.34315 21 3 19.8807 3 18.5C3 17.1193 4.34315 16 6 16C7.65685 16 9 17.1193 9 18.5Z" stroke="#5C5C5A" stroke-width="1.9"/>
  <path d="M21 16.5C21 17.8807 19.6569 19 18 19C16.3431 19 15 17.8807 15 16.5C15 15.1193 16.3431 14 18 14C19.6569 14 21 15.1193 21 16.5Z" stroke="#5C5C5A" stroke-width="1.9"/>
  <path d="M9 18.5V5.5L21 3.5V16.5" stroke="#5C5C5A" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M9 9L21 7" stroke="#5C5C5A" stroke-width="1.9" stroke-linecap="round"/>
</svg>
`;

async function exportIcon(name: string, svg: string) {
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

  await exportIcon("drag-folder.png", folderSvg);
  await exportIcon("drag-file.png", fileSvg);

  console.log("Exported drag icon PNGs.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
