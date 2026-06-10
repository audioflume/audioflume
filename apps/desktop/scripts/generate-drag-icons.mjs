import React from "react";
import satori from "satori";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const desktopRoot = path.resolve(__dirname, "..");
const outputDir = path.join(desktopRoot, "src-tauri", "icons");

const h = React.createElement;

const frameStyle = {
  width: "128px",
  height: "128px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "transparent",
};

const folderIcon = h(
  "div",
  { style: frameStyle },
  h(
    "div",
    {
      style: {
        position: "relative",
        width: "82px",
        height: "64px",
        display: "flex",
      },
    },
    h("div", {
      style: {
        position: "absolute",
        left: "8px",
        top: "4px",
        width: "36px",
        height: "18px",
        borderRadius: "7px 7px 3px 3px",
        background: "#545451",
      },
    }),
    h("div", {
      style: {
        position: "absolute",
        left: "0px",
        top: "18px",
        width: "82px",
        height: "46px",
        borderRadius: "10px",
        background: "#3f3f3c",
        border: "1px solid rgba(255,255,255,0.14)",
      },
    }),
  ),
);

const fileIcon = h(
  "div",
  { style: frameStyle },
  h(
    "div",
    {
      style: {
        position: "relative",
        width: "78px",
        height: "78px",
        display: "flex",
        borderRadius: "17px",
        background: "#f4f4f1",
        border: "1px solid rgba(0,0,0,0.08)",
      },
    },
    h("div", {
      style: {
        position: "absolute",
        left: "31px",
        top: "24px",
        width: "6px",
        height: "30px",
        borderRadius: "3px",
        background: "#5f5f5a",
      },
    }),
    h("div", {
      style: {
        position: "absolute",
        left: "50px",
        top: "20px",
        width: "6px",
        height: "28px",
        borderRadius: "3px",
        background: "#5f5f5a",
      },
    }),
    h("div", {
      style: {
        position: "absolute",
        left: "31px",
        top: "21px",
        width: "25px",
        height: "6px",
        borderRadius: "3px",
        background: "#5f5f5a",
        transform: "rotate(-8deg)",
      },
    }),
    h("div", {
      style: {
        position: "absolute",
        left: "20px",
        top: "49px",
        width: "20px",
        height: "15px",
        borderRadius: "999px",
        background: "#5f5f5a",
      },
    }),
    h("div", {
      style: {
        position: "absolute",
        left: "39px",
        top: "43px",
        width: "20px",
        height: "15px",
        borderRadius: "999px",
        background: "#5f5f5a",
      },
    }),
  ),
);

async function renderIcon(element, outputName) {
  const svg = await satori(element, {
    width: 128,
    height: 128,
    fonts: [],
  });

  await sharp(Buffer.from(svg)).png().toFile(path.join(outputDir, outputName));
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  await renderIcon(folderIcon, "drag-folder.png");
  await renderIcon(fileIcon, "drag-file.png");

  console.log("Generated drag preview icons.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
