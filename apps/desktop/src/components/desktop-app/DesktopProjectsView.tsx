import { invoke } from "@tauri-apps/api/core";
import { appCacheDir, join } from "@tauri-apps/api/path";
import { exists, writeFile } from "@tauri-apps/plugin-fs";
import { startDrag } from "@crabnebula/tauri-plugin-drag";
import { useEffect, useMemo, useRef, useState } from "react";
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

type ProjectTab =
  | "overview"
  | "music"
  | "sound-fx"
  | "visual-fx"
  | "colour-grading"
  | "licenses";
type ProjectFileView = "grid" | "list";
type ProjectSyncState = "success" | "syncing" | "error";

type DesktopProjectsViewProps = {
  activeProjectId: string | null;
  projects: Project[];
  projectsLoading: boolean;
  syncFolder: string | null;
  syncStatus: string;
  onActiveProjectIdChange: (projectId: string | null) => void;
};

type ProjectTabDefinition = {
  label: string;
  value: ProjectTab;
};

type MediaTabDefinition = ProjectTabDefinition & {
  rootFolderName: string;
};

const ALL_FILES_TAB: ProjectTabDefinition = {
  label: "All Files",
  value: "overview",
};
const LICENSES_TAB: ProjectTabDefinition = {
  label: "Licenses",
  value: "licenses",
};

const MEDIA_TABS: MediaTabDefinition[] = [
  { label: "Music", value: "music", rootFolderName: "Music" },
  { label: "Sound FX", value: "sound-fx", rootFolderName: "Sound FX" },
  { label: "Visual FX", value: "visual-fx", rootFolderName: "Visual FX" },
  {
    label: "Colour Grading",
    value: "colour-grading",
    rootFolderName: "Colour Grading",
  },
];

const ERROR_SYNC_PATTERNS = ["failed", "error", "could not"];
const SYNCING_PATTERNS = [
  "syncing",
  "refreshing",
  "checking",
  "applying",
  "updating",
];

function GridViewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect x="4" y="4" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="4" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="4" y="14" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
      <rect x="14" y="14" width="6" height="6" rx="1.2" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function ListViewIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M8 6H20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M8 12H20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M8 18H20" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M4.5 6H4.51" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4.5 12H4.51" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M4.5 18H4.51" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12H5.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M12 12H12.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M19 12H19.01" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" />
    </svg>
  );
}

function formatFileCount(count: number) {
  return `${count} ${count === 1 ? "file" : "files"}`;
}

function getProjectSyncState(syncStatus: string): ProjectSyncState {
  const normalizedStatus = syncStatus.toLowerCase();
  if (ERROR_SYNC_PATTERNS.some((p) => normalizedStatus.includes(p))) return "error";
  if (SYNCING_PATTERNS.some((p) => normalizedStatus.includes(p))) return "syncing";
  return "success";
}

function getLatestProjectFileDate(project: Project) {
  const timestamps = project.files
    .map((node) => node.updatedAt)
    .filter((value): value is string => Boolean(value))
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));
  if (timestamps.length === 0) return null;
  return new Date(Math.max(...timestamps));
}

function formatSyncTime(project: Project, syncState: ProjectSyncState) {
  if (syncState === "syncing") return "Syncing now";
  if (syncState === "error") return "Sync error";
  const latestFileDate = getLatestProjectFileDate(project);
  if (!latestFileDate) return "Last synced status ready";
  return `Last synced at ${latestFileDate.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
}

function getNodeDepth(node: ProjectFileNode) {
  return node.path.split("/").filter(Boolean).length;
}

function getNodeParentPath(node: ProjectFileNode) {
  const parts = node.path.split("/").filter(Boolean);
  parts.pop();
  return parts.join("/");
}

function normalizeReservedMediaName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function getRootPathName(path: string) {
  return path.split("/").filter(Boolean)[0] ?? "";
}

function projectHasMediaForFolder(project: Project, rootFolderName: string) {
  const normalizedFolderName = normalizeReservedMediaName(rootFolderName);
  return project.files.some(
    (node) =>
      node.type === "file" &&
      normalizeReservedMediaName(getRootPathName(node.path)) === normalizedFolderName,
  );
}

function getVisibleProjectTabs(project: Project): ProjectTabDefinition[] {
  return [
    ALL_FILES_TAB,
    ...MEDIA_TABS.filter((tab) => projectHasMediaForFolder(project, tab.rootFolderName)),
    LICENSES_TAB,
  ];
}

function isEmptyReservedMediaFolder(project: Project, node: ProjectFileNode) {
  if (node.type !== "folder") return false;
  if (getNodeDepth(node) !== 1) return false;
  return MEDIA_TABS.some(
    (tab) =>
      normalizeReservedMediaName(node.name) === normalizeReservedMediaName(tab.rootFolderName) &&
      !projectHasMediaForFolder(project, tab.rootFolderName),
  );
}

function getNodeChildren(project: Project, folder: ProjectFileNode | null) {
  const folderPath = folder?.path ?? "";
  const expectedDepth = folder ? getNodeDepth(folder) + 1 : 1;
  return project.files
    .filter((node) => {
      if (node.id === folder?.id) return false;
      if (!folder && isEmptyReservedMediaFolder(project, node)) return false;
      const parentPath = getNodeParentPath(node);
      return parentPath === folderPath && getNodeDepth(node) === expectedDepth;
    })
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
      return a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
    });
}

function getFolderFileCount(project: Project, folder: ProjectFileNode) {
  const prefix = `${folder.path}/`;
  return project.files.filter((node) => node.type === "file" && node.path.startsWith(prefix)).length;
}

function getFolderChain(project: Project, activeFolder: ProjectFileNode | null) {
  if (!activeFolder) return [];
  const chain: ProjectFileNode[] = [];
  const pathParts = activeFolder.path.split("/").filter(Boolean);
  pathParts.forEach((_, index) => {
    const path = pathParts.slice(0, index + 1).join("/");
    const folder = project.files.find((node) => node.type === "folder" && node.path === path);
    if (folder) chain.push(folder);
  });
  return chain;
}

function getFileArtist(node: ProjectFileNode) {
  return node.path.includes("/") ? getNodeParentPath(node).split("/").pop() : "Filmwave";
}

// ─── Drag ghost generation ────────────────────────────────────────────────────
//
// Renders a card-style PNG ghost that matches the website's grid card layout:
// icon centered on top, display name centered below (and artist for files).
// Rendered at 2x DPR for Retina crispness. Cached per node.id.

const GHOST_CACHE = new Map<string, Promise<string | null>>();

// Folder SVG — matches FolderGlyph from ProjectBrowserGlyphs
const FOLDER_SVG_SOURCE = `<svg width="62" height="54" viewBox="0 0 62 54" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fwft" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3b3b3b"/>
      <stop offset="1" stop-color="#252525"/>
    </linearGradient>
    <linearGradient id="fwfb" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3a3a"/>
      <stop offset="0.48" stop-color="#242424"/>
      <stop offset="1" stop-color="#151515"/>
    </linearGradient>
  </defs>
  <path d="M0 10 a4 4 0 0 1 4 -4 h20 a5 5 0 0 1 5 5 v3 H0 Z" fill="url(#fwft)"/>
  <path d="M4 6.5 h20" stroke="rgba(255,255,255,0.18)" stroke-width="1" stroke-linecap="round"/>
  <rect x="0" y="11" width="62" height="43" rx="5" fill="url(#fwfb)"/>
  <rect x="1" y="12" width="60" height="1.4" rx="0.7" fill="rgba(255,255,255,0.22)"/>
  <rect x="1" y="52.4" width="60" height="1" rx="0.5" fill="rgba(0,0,0,0.72)"/>
</svg>`;

// Music note SVG — user-provided artwork, light fill so it reads on dark tile
const MUSIC_SVG_SOURCE = `<svg width="48.83" height="66.94" viewBox="0 0 48.83 66.94" xmlns="http://www.w3.org/2000/svg">
  <path d="M48.62,15.64c-2-9.61-18.89-7.59-19.97-15.64h-3.76v54.49c-2.33-2.42-6.6-4.04-11.5-4.04-7.39,0-13.38,3.69-13.38,8.25s5.99,8.25,13.38,8.25c.15,0,.3-.01.45-.01.16,0,.32.01.49.01,7.91,0,14.32-3.69,14.32-8.25V11.74c3.46,4,12.53,2.97,14.12,7.65.66,1.93-.05,3.81-2.16,6.31l2.43,1.94c3.44-3.95,6.66-6.82,5.59-12Z" fill="rgba(180,180,180,0.85)"/>
</svg>`;

function loadSvgAsImage(svgSource: string, nativeWidth: number, nativeHeight: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([svgSource], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const img = new Image(nativeWidth, nativeHeight);
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("SVG load failed")); };
    img.src = url;
  });
}

// Truncate text to fit within maxWidth using canvas measurement.
function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + "\u2026").width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "\u2026";
}

async function generateDragGhostPng(
  nodeId: string,
  nodeType: ProjectFileNode["type"],
  displayName: string,
  artistName: string | undefined,
): Promise<string | null> {
  const DPR = 2;

  // Card layout constants (logical pixels at 1x, matching the grid card style)
  const CARD_WIDTH = 120;
  const CARD_PAD_H = 12;
  const CARD_PAD_TOP = 14;
  const CARD_PAD_BOTTOM = 14;
  const ICON_AREA_HEIGHT = nodeType === "folder" ? 54 : 44; // matches glyph heights
  const ICON_GAP = 10; // gap between icon bottom and name
  const NAME_FONT = `500 13px -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif`;
  const ARTIST_FONT = `400 11px -apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif`;
  const LINE_HEIGHT_NAME = 17;
  const LINE_HEIGHT_ARTIST = 15;
  const BORDER_RADIUS = 10;

  // Total card height: top pad + icon + gap + name + (artist?) + bottom pad
  const hasArtist = nodeType === "file" && artistName;
  const CARD_HEIGHT =
    CARD_PAD_TOP +
    ICON_AREA_HEIGHT +
    ICON_GAP +
    LINE_HEIGHT_NAME +
    (hasArtist ? LINE_HEIGHT_ARTIST + 2 : 0) +
    CARD_PAD_BOTTOM;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(CARD_WIDTH * DPR);
  canvas.height = Math.ceil(CARD_HEIGHT * DPR);

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.scale(DPR, DPR);

  // Card background — dark, matching project-folder-card / project-file-card
  ctx.fillStyle = "rgba(32, 32, 36, 0.96)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(BORDER_RADIUS, 0);
  ctx.lineTo(CARD_WIDTH - BORDER_RADIUS, 0);
  ctx.quadraticCurveTo(CARD_WIDTH, 0, CARD_WIDTH, BORDER_RADIUS);
  ctx.lineTo(CARD_WIDTH, CARD_HEIGHT - BORDER_RADIUS);
  ctx.quadraticCurveTo(CARD_WIDTH, CARD_HEIGHT, CARD_WIDTH - BORDER_RADIUS, CARD_HEIGHT);
  ctx.lineTo(BORDER_RADIUS, CARD_HEIGHT);
  ctx.quadraticCurveTo(0, CARD_HEIGHT, 0, CARD_HEIGHT - BORDER_RADIUS);
  ctx.lineTo(0, BORDER_RADIUS);
  ctx.quadraticCurveTo(0, 0, BORDER_RADIUS, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Icon — centered horizontally in the card
  const iconAreaTop = CARD_PAD_TOP;
  try {
    if (nodeType === "folder") {
      // Folder is 62x54; display at natural size centered
      const folderW = 62;
      const folderH = 54;
      const folderX = (CARD_WIDTH - folderW) / 2;
      const img = await loadSvgAsImage(FOLDER_SVG_SOURCE, 62, 54);
      ctx.drawImage(img, folderX, iconAreaTop, folderW, folderH);
    } else {
      // Music tile: dark rounded square 44x44 with note inside
      const tileSize = 44;
      const tileX = (CARD_WIDTH - tileSize) / 2;
      const tileY = iconAreaTop;
      const tileRadius = 8;

      // Draw tile background
      ctx.fillStyle = "#2a2a2e";
      ctx.strokeStyle = "rgba(255,255,255,0.10)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(tileX + tileRadius, tileY);
      ctx.lineTo(tileX + tileSize - tileRadius, tileY);
      ctx.quadraticCurveTo(tileX + tileSize, tileY, tileX + tileSize, tileY + tileRadius);
      ctx.lineTo(tileX + tileSize, tileY + tileSize - tileRadius);
      ctx.quadraticCurveTo(tileX + tileSize, tileY + tileSize, tileX + tileSize - tileRadius, tileY + tileSize);
      ctx.lineTo(tileX + tileRadius, tileY + tileSize);
      ctx.quadraticCurveTo(tileX, tileY + tileSize, tileX, tileY + tileSize - tileRadius);
      ctx.lineTo(tileX, tileY + tileRadius);
      ctx.quadraticCurveTo(tileX, tileY, tileX + tileRadius, tileY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Draw note inside tile, centered
      const noteH = 16;
      const noteW = noteH * (48.83 / 66.94);
      const noteX = tileX + (tileSize - noteW) / 2;
      const noteY = tileY + (tileSize - noteH) / 2;
      const img = await loadSvgAsImage(MUSIC_SVG_SOURCE, 49, 67);
      ctx.drawImage(img, noteX, noteY, noteW, noteH);
    }
  } catch {
    // Icon failed — text still renders
  }

  // Name text — centered, truncated
  const textAreaLeft = CARD_PAD_H;
  const textMaxWidth = CARD_WIDTH - CARD_PAD_H * 2;
  const nameY = CARD_PAD_TOP + ICON_AREA_HEIGHT + ICON_GAP + LINE_HEIGHT_NAME / 2;

  ctx.font = NAME_FONT;
  ctx.fillStyle = "rgba(255, 255, 255, 0.90)";
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  const truncatedName = truncateText(ctx, displayName, textMaxWidth);
  ctx.fillText(truncatedName, CARD_WIDTH / 2, nameY);

  // Artist text (files only) — centered, muted
  if (hasArtist) {
    const artistY = nameY + LINE_HEIGHT_NAME / 2 + 2 + LINE_HEIGHT_ARTIST / 2;
    ctx.font = ARTIST_FONT;
    ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
    const truncatedArtist = truncateText(ctx, artistName!, textMaxWidth);
    ctx.fillText(truncatedArtist, CARD_WIDTH / 2, artistY);
  }

  // Export to PNG and write to cache dir
  const pngBlob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
      "image/png",
    ),
  );

  const bytes = new Uint8Array(await pngBlob.arrayBuffer());
  const cacheDir = await appCacheDir();
  const safeId = nodeId.replace(/[^a-zA-Z0-9]/g, "_").slice(0, 40);
  const iconPath = await join(cacheDir, `filmwave-drag-${safeId}.png`);
  await writeFile(iconPath, bytes);

  return iconPath;
}

// ─── Drag handler ─────────────────────────────────────────────────────────────

async function handleNodeDragStart(
  event: React.DragEvent<HTMLElement>,
  node: ProjectFileNode,
  project: Project,
  syncFolder: string | null,
) {
  event.preventDefault();

  if (!syncFolder) {
    console.warn("Choose a sync folder before dragging project files.");
    return;
  }

  const localPath = getProjectNodeLocalPath({ node, project, syncFolder });
  const displayName = node.type === "file" ? node.name.replace(/\.[^/.]+$/, "") : node.name;
  const artistName = node.type === "file" ? getFileArtist(node) : undefined;

  if (!GHOST_CACHE.has(node.id)) {
    GHOST_CACHE.set(
      node.id,
      generateDragGhostPng(node.id, node.type, displayName, artistName).catch((error) => {
        console.warn("Drag ghost generation failed:", error);
        return null;
      }),
    );
  }

  const icon = await GHOST_CACHE.get(node.id)!;

  if (!icon) {
    console.error("Native file drag failed: ghost icon could not be generated.");
    return;
  }

  try {
    await startDrag({ item: [localPath], icon });
  } catch (error) {
    console.error("Native file drag failed:", error);
  }
}

// ─── Finder reveal ────────────────────────────────────────────────────────────

async function showProjectInFinder(project: Project, syncFolder: string | null) {
  if (!syncFolder) {
    console.warn("Choose a sync folder before revealing a project in Finder.");
    return;
  }
  const projectPath = getProjectFolderPath(syncFolder, project);
  if (!(await exists(projectPath))) {
    console.warn(`Synced project folder does not exist yet: ${projectPath}`);
    return;
  }
  await invoke("open_path", { path: projectPath });
}

// ─── UI components ────────────────────────────────────────────────────────────

function ProjectSyncStatus({ project, syncStatus }: { project: Project; syncStatus: string }) {
  const syncState = getProjectSyncState(syncStatus);
  return (
    <span className={`project-sync-status is-${syncState}`}>
      <span>{formatSyncTime(project, syncState)}</span>
      <span className="project-sync-status-dot" />
    </span>
  );
}

function ProjectToolbar({
  project,
  syncFolder,
  viewMode,
  onToggleViewMode,
}: {
  project: Project;
  syncFolder: string | null;
  viewMode: ProjectFileView;
  onToggleViewMode: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current) return;
      if (menuRef.current.contains(event.target as Node)) return;
      setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function handleUnavailableAction(label: string) {
    console.warn(`${label} is not available in the desktop app yet.`);
    setOpen(false);
  }

  return (
    <div className="project-toolbar-actions">
      <button
        type="button"
        className="project-toolbar-icon-button"
        aria-label={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
        title={viewMode === "grid" ? "Switch to list view" : "Switch to grid view"}
        onClick={onToggleViewMode}
      >
        {viewMode === "grid" ? <ListViewIcon /> : <GridViewIcon />}
      </button>
      <div ref={menuRef} className="project-more-menu-wrap">
        <button
          type="button"
          className={`project-toolbar-icon-button ${open ? "is-active" : ""}`}
          aria-label="More project actions"
          aria-expanded={open}
          title="More"
          onClick={() => setOpen((current) => !current)}
        >
          <MoreIcon />
        </button>
        {open && (
          <div className="project-more-dropdown" role="menu">
            <button type="button" className="project-more-menu-button" role="menuitem" onClick={() => handleUnavailableAction("Edit project")}>Edit project</button>
            <button type="button" className="project-more-menu-button" role="menuitem" onClick={() => { setOpen(false); void showProjectInFinder(project, syncFolder); }}>Show in Finder</button>
            <button type="button" className="project-more-menu-button" role="menuitem" onClick={() => handleUnavailableAction("Version history")}>Version history</button>
            <button type="button" className="project-more-menu-button" role="menuitem" onClick={() => handleUnavailableAction("Archive project")}>Archive project</button>
            <button type="button" className="project-more-menu-button is-danger" role="menuitem" onClick={() => handleUnavailableAction("Delete project")}>Delete project</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectListView({
  projects,
  projectsLoading,
  onOpenProject,
}: {
  projects: Project[];
  projectsLoading: boolean;
  onOpenProject: (projectId: string) => void;
}) {
  return (
    <section className="desktop-projects-page desktop-projects-list-page">
      <div className="desktop-projects-list-header">
        <div>
          <div className="desktop-projects-list-eyebrow">Desktop companion</div>
          <h1 className="desktop-projects-list-title">Projects</h1>
          <p className="desktop-projects-list-copy">Select a project to browse its synced file structure.</p>
        </div>
      </div>
      <div className="desktop-project-list-shell">
        {projectsLoading ? (
          <div className="desktop-project-list-button" role="status">
            <div>
              <div className="desktop-project-list-name">Loading projects...</div>
              <div className="desktop-project-list-meta">Fetching your Filmwave project list.</div>
            </div>
          </div>
        ) : projects.length > 0 ? (
          projects.map((project) => (
            <button key={project.id} type="button" className="desktop-project-list-button" onClick={() => onOpenProject(project.id)}>
              <div>
                <div className="desktop-project-list-name">{project.name}</div>
                <div className="desktop-project-list-meta">{project.fileCount} files · {project.sizeLabel}</div>
              </div>
              <span className="desktop-project-list-arrow" aria-hidden="true">›</span>
            </button>
          ))
        ) : (
          <div className="desktop-project-list-button" role="status">
            <div>
              <div className="desktop-project-list-name">No projects loaded</div>
              <div className="desktop-project-list-meta">Connect your Filmwave account in Desktop Sync settings.</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function ProjectGridItem({
  node,
  project,
  syncFolder,
  onOpenFolder,
}: {
  node: ProjectFileNode;
  project: Project;
  syncFolder: string | null;
  onOpenFolder: (folder: ProjectFileNode) => void;
}) {
  if (node.type === "folder") {
    return (
      <div
        role="button"
        tabIndex={0}
        draggable
        className="project-folder-card"
        title={syncFolder ? "Drag synced folder" : "Choose a sync folder before dragging"}
        onDragStart={(event) => handleNodeDragStart(event, node, project, syncFolder)}
        onClick={() => onOpenFolder(node)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpenFolder(node); }}
      >
        <span className="project-folder-card-icon-wrap"><DesktopFolderGlyph /></span>
        <span className="project-folder-card-name">{node.name}</span>
        <span className="project-folder-card-meta">{formatFileCount(getFolderFileCount(project, node))}</span>
      </div>
    );
  }
  return (
    <div
      draggable
      className="project-file-card"
      title={syncFolder ? "Drag synced file" : "Choose a sync folder before dragging"}
      onDragStart={(event) => handleNodeDragStart(event, node, project, syncFolder)}
    >
      <div className="project-file-card-icon-wrap"><DesktopMusicGlyph /></div>
      <div className="project-file-card-title">{node.name.replace(/\.[^/.]+$/, "")}</div>
      <div className="project-file-card-meta">{getFileArtist(node)}</div>
    </div>
  );
}

function ProjectListItem({
  node,
  project,
  syncFolder,
  onOpenFolder,
}: {
  node: ProjectFileNode;
  project: Project;
  syncFolder: string | null;
  onOpenFolder: (folder: ProjectFileNode) => void;
}) {
  if (node.type === "folder") {
    const totalItems = getNodeChildren(project, node).length;
    return (
      <div
        role="button"
        tabIndex={0}
        draggable
        className="project-browser-row project-folder-row"
        title={syncFolder ? "Drag synced folder" : "Choose a sync folder before dragging"}
        onDragStart={(event) => handleNodeDragStart(event, node, project, syncFolder)}
        onClick={() => onOpenFolder(node)}
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpenFolder(node); }}
      >
        <span className="project-browser-row-name">
          <DesktopFolderGlyph small />
          <span className="project-browser-row-title">{node.name}</span>
        </span>
        <span className="project-browser-row-muted">{totalItems || "--"}</span>
        <span className="project-browser-row-muted">Folder</span>
        <span />
      </div>
    );
  }
  return (
    <div
      draggable
      className="project-browser-row project-file-row"
      title={syncFolder ? "Drag synced file" : "Choose a sync folder before dragging"}
      onDragStart={(event) => handleNodeDragStart(event, node, project, syncFolder)}
    >
      <span className="project-browser-row-name">
        <span className="project-file-list-icon-wrap"><DesktopMusicGlyph small /></span>
        <span className="project-browser-row-title">{node.name.replace(/\.[^/.]+$/, "")}</span>
      </span>
      <span className="project-browser-row-muted">{getFileArtist(node)}</span>
      <span className="project-browser-row-muted">Music</span>
      <span />
    </div>
  );
}

function ProjectDetailView({
  project,
  syncFolder,
  syncStatus,
  onBack,
}: {
  project: Project;
  syncFolder: string | null;
  syncStatus: string;
  onBack: () => void;
}) {
  const visibleTabs = useMemo(() => getVisibleProjectTabs(project), [project]);
  const [activeTab, setActiveTab] = useState<ProjectTab>("overview");
  const [activeFolder, setActiveFolder] = useState<ProjectFileNode | null>(null);
  const [viewMode, setViewMode] = useState<ProjectFileView>("grid");

  useEffect(() => {
    if (!visibleTabs.some((tab) => tab.value === activeTab)) {
      setActiveTab("overview");
      setActiveFolder(null);
    }
  }, [activeTab, visibleTabs]);

  const visibleNodes = useMemo(() => {
    if (activeTab !== "overview") return [];
    return getNodeChildren(project, activeFolder);
  }, [activeFolder, activeTab, project]);

  const breadcrumbFolders = useMemo(() => getFolderChain(project, activeFolder), [activeFolder, project]);

  function changeTab(nextTab: ProjectTab) {
    setActiveTab(nextTab);
    setActiveFolder(null);
  }

  function toggleViewMode() {
    setViewMode((current) => (current === "grid" ? "list" : "grid"));
  }

  return (
    <section className="desktop-projects-page is-detail project-detail-page">
      <div className="project-tabs-row">
        <button type="button" className="filmwave-filter-trigger" onClick={onBack} aria-label="Back to projects">Projects</button>
        {visibleTabs.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`filmwave-filter-trigger${activeTab === tab.value ? " is-active" : ""}`}
            onClick={() => changeTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <section className="project-detail-hero">
        <span className="project-detail-kicker">Project</span>
        <h1 className="project-detail-title">{project.name}</h1>
        <div className="project-detail-meta">
          <span>Project workspace</span>
          <span>·</span>
          <span>{project.fileCount} files</span>
          <span>·</span>
          <ProjectSyncStatus project={project} syncStatus={syncStatus} />
        </div>
      </section>
      <section className="project-file-browser">
        <div className="project-file-browser-top">
          <div className="project-breadcrumbs project-path">
            <button type="button" className={!activeFolder ? "is-current" : ""} onClick={() => setActiveFolder(null)}>All Files</button>
            {breadcrumbFolders.map((folder) => (
              <span key={folder.id}>
                <span className="project-path-separator">/</span>
                <button type="button" className={activeFolder?.id === folder.id ? "is-current" : ""} onClick={() => setActiveFolder(folder)}>{folder.name}</button>
              </span>
            ))}
          </div>
          <ProjectToolbar project={project} syncFolder={syncFolder} viewMode={viewMode} onToggleViewMode={toggleViewMode} />
        </div>
        <div className="project-file-browser-section">
          {activeTab !== "overview" ? (
            <div className="project-empty-state">This tab will mirror website media types next.</div>
          ) : visibleNodes.length > 0 ? (
            viewMode === "grid" ? (
              <div className="project-browser-grid">
                {visibleNodes.map((node) => (
                  <ProjectGridItem key={node.id} node={node} project={project} syncFolder={syncFolder} onOpenFolder={setActiveFolder} />
                ))}
              </div>
            ) : (
              <div className="project-browser-list">
                {visibleNodes.map((node) => (
                  <ProjectListItem key={node.id} node={node} project={project} syncFolder={syncFolder} onOpenFolder={setActiveFolder} />
                ))}
              </div>
            )
          ) : (
            <div className="project-empty-state">This folder is empty.</div>
          )}
        </div>
      </section>
    </section>
  );
}

export default function DesktopProjectsView({
  activeProjectId,
  projects,
  projectsLoading,
  syncFolder,
  syncStatus,
  onActiveProjectIdChange,
}: DesktopProjectsViewProps) {
  const activeProject = projects.find((project) => project.id === activeProjectId) ?? null;

  if (activeProject) {
    return (
      <ProjectDetailView
        project={activeProject}
        syncFolder={syncFolder}
        syncStatus={syncStatus}
        onBack={() => onActiveProjectIdChange(null)}
      />
    );
  }

  return (
    <ProjectListView
      projects={projects}
      projectsLoading={projectsLoading}
      onOpenProject={onActiveProjectIdChange}
    />
  );
}
