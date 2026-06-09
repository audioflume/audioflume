// @ts-nocheck

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

import FolderIcon from "../src/components/icons/FolderIcon";
import MusicIcon from "../src/components/icons/MusicIcon";

const outputDir = path.resolve(process.cwd(), "src-tauri/icons");

function withSize(svg: string) {
  const close