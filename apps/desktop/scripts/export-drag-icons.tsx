// @ts-nocheck

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import FolderIcon from "../src/components/icons/FolderIcon";
import MusicIcon from "../src/components/icons/MusicIcon";

const outputDir = path.resolve("src-tauri/icons");

function getSvgInnerMarkup(svg: string) {
  const firstClose = svg.indexOf(">");
  const lastOpen = svg