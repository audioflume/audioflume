import { invoke } from "@tauri-apps/api/core";
import { exists } from "@tauri-apps/plugin-fs";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Project, ProjectFileNode } from "../../lib/mockFilmwaveApi";
import {
  getProjectFolderPath,
  getProjectNodeLocalPath,
} from "../../lib/syncEngine";
import {
  DesktopFolderGlyph,
  DesktopMusicGlyph,
} from "./DesktopProjectBrowserGlyphs";
import "./DesktopProjectsView.css";
import "./DesktopProjectsViewOverrides.css";
import "./DesktopProjectGridTight.css";
import "../../../../../packages/shared/styles/project-browser-icons.css";

type ProjectTab =
  | "overview"
  | "music"
  | "sound-fx"
  | "visual-fx"
  | "colour-grading"
  | "licenses";
type ProjectFileView = "grid" | "list";
type ProjectSyncState = "success" | "syncing" | "error";

