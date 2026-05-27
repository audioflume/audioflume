import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import {
  applyDesktopLocalChanges,
  applyDesktopLocalRemovals,
  getFilmwaveProjects,
  normalizeFilmwaveApiBaseUrl,
  type Project,
} from "./mockFilmwaveApi";
import {
  detectDesktopLocalChanges,
  hasDesktopLocalChanges,
} from "./localFolderChanges";
import { formatLocalChangesSummary } from "./localChangeDetector";
import { detectLocalRemovals, syncProjectsToFolder } from "./syncEngine";

const SETTINGS_STORE = "filmwave-settings.json";
const LOCAL_CHANGE_DEBOUNCE_MS = 2500;
const LOCAL_REMOVE_DEBOUNCE_MS = 700;
const WEBSITE_CHANGE_DEBOUNCE_MS = 1000;
const SETTINGS_REFRESH_MS = 10000;
const LOCAL_RECONCILE_SWEEP_MS = 20000;
const WEBSITE_RECONCILE_SWEEP_MS = 30000;
const MIN_SYNC_GAP_MS = 750;

const REALTIME_UPDATED_EVENT = "filmwave:realtime-projects-updated";

type RealtimeSettings = {
  apiBaseUrl: string;
  autoSyncEnabled: boolean;
  desktopToken: string | null;
  projectSource: "mock" | "local-api";
  syncFolder: string | null;
};

type ProjectChangePayload = {
  projectId?: string | number;
  source?: string;
  eventType?: string;
};

type LocalFolderChangePayload = {
  kind?: string;
  paths?: string[];
  syncFolder?: string;
};

type SyncReason = "local" | "website";

let started = false;
let currentWatchedFolder: string | null = null;
let currentEventSource: EventSource | null = null;
let localChangeTimer: number | null = null;
let websiteChangeTimer: number | null = null;
let settingsRefreshTimer: number | null = null;
let localReconcileSweepTimer: number | null = null;
let websiteReconcileSweepTimer: number | null = null;
let queuedLocalSync = false;
let queuedWebsiteSync = false;
let pendingWebsiteProjectIds = new Set<string>();
let syncing = false;
let lastSyncFinishedAt = 0;

async function readSettings(): Promise<RealtimeSettings> {
  const store = await load(SETTINGS_STORE);
  const apiBaseUrl = normalizeFilmwaveApiBaseUrl(await store.get<string>("apiBaseUrl"));
  const autoSyncEnabled = Boolean(await store.get<boolean>("autoSyncEnabled"));
  const desktopToken = (await store.get<string>("desktopToken")) ?? null;
  const projectSource = (await store.get<"mock" | "local-api">("projectSource")) ?? "mock";
  const syncFolder = (await store.get<string>("syncFolder")) ?? null;

  return {
    apiBaseUrl,
    autoSyncEnabled,
    desktopToken,
    projectSource,
    syncFolder,
  };
}

function shouldRunRealtimeSync(settings: RealtimeSettings) {
  return (
    settings.autoSyncEnabled &&
    settings.projectSource === "local-api" &&
    Boolean(settings.desktopToken) &&
    Boolean(settings.syncFolder)
  );
}

async function addActivityLogEntry({
  detail,
  mode,
  projectNames,
  status,
  title,
}: {
  mode: "manual" | "auto" | "local" | "system";
  projectNames: string[];
  status: "success" | "error" | "info";
  title: string;
  detail: string;
}) {
  const store = await load(SETTINGS_STORE);
  const current = (await store.get<any[]>("syncActivityLog")) ?? [];
  const nextEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
    mode,
    status,
    title,
    detail,
    projectNames,
  };

  await store.set("syncActivityLog", [nextEntry, ...current].slice(0, 10));
  await store.save();
}

function getProjectNames(projects: Project[]) {
  return projects.map((project) => project.name).filter(Boolean);
}

function filterProjectsByIds(projects: Project[], projectIds: Set<string>) {
  if (projectIds.size === 0) return projects;

  return projects.filter((project) => projectIds.has(String(project.id)));
}

function dispatchRealtimeUpdated({
  projects,
  reason,
  updatedProjectIds,
}: {
  projects: Project[];
  reason: SyncReason;
  updatedProjectIds: Set<string>;
}) {
  window.dispatchEvent(
    new CustomEvent(REALTIME_UPDATED_EVENT, {
      detail: {
        projectIds: [...updatedProjectIds],
        projects,
        reason,
        updatedAt: new Date().toISOString(),
      },
    }),
  );
}

function isRemovalFolderChangeEvent(payload: unknown) {
  if (!payload || typeof payload !== "object") return false;

  const kind = String((payload as LocalFolderChangePayload).kind ?? "").toLowerCase();

  return kind.includes("remove") || kind.includes("delete");
}

function clearTimer(timer: number | null) {
  if (timer) window.clearTimeout(timer);
}

function queueAfterSync(reason: SyncReason, projectIds = new Set<string>()) {
  if (reason === "local") {
    queuedLocalSync = true;
    return;
  }

  queuedWebsiteSync = true;
  projectIds.forEach((projectId) => pendingWebsiteProjectIds.add(projectId));
}

function runQueuedSyncs() {
  if (syncing) return;

  if (queuedLocalSync) {
    queuedLocalSync = false;
    scheduleLocalSync(LOCAL_CHANGE_DEBOUNCE_MS);
    return;
  }

  if (queuedWebsiteSync) {
    queuedWebsiteSync = false;
    scheduleWebsiteSync();
  }
}

function scheduleLocalSync(delayMs = LOCAL_CHANGE_DEBOUNCE_MS) {
  clearTimer(localChangeTimer);

  localChangeTimer = window.setTimeout(() => {
    localChangeTimer = null;
    void runEventDrivenSync("local");
  }, Math.max(0, delayMs));
}

function scheduleWebsiteSync(projectId?: string | number) {
  if (projectId != null) {
    pendingWebsiteProjectIds.add(String(projectId));
  }

  clearTimer(websiteChangeTimer);

  websiteChangeTimer = window.setTimeout(() => {
    const projectIds = new Set(pendingWebsiteProjectIds);
    pendingWebsiteProjectIds.clear();
    websiteChangeTimer = null;
    void runEventDrivenSync("website", projectIds);
  }, WEBSITE_CHANGE_DEBOUNCE_MS);
}

async function runEventDrivenSync(reason: SyncReason, projectIds = new Set<string>()) {
  if (syncing) {
    queueAfterSync(reason, projectIds);
    return;
  }

  const syncGapRemainingMs = MIN_SYNC_GAP_MS - (Date.now() - lastSyncFinishedAt);

  if (syncGapRemainingMs > 0) {
    if (reason === "local") scheduleLocalSync(syncGapRemainingMs);
    if (reason === "website") {
      projectIds.forEach((projectId) => pendingWebsiteProjectIds.add(projectId));
      scheduleWebsiteSync();
    }
    return;
  }

  const settings = await readSettings();

  if (!shouldRunRealtimeSync(settings)) return;
  if (!settings.desktopToken || !settings.syncFolder) return;

  syncing = true;

  try {
    if (reason === "local") {
      await runLocalToWebsiteSync(settings);
    } else {
      await runWebsiteToLocalSync(settings, projectIds);
    }
  } finally {
    syncing = false;
    lastSyncFinishedAt = Date.now();
    runQueuedSyncs();
  }
}

async function runLocalToWebsiteSync(settings: RealtimeSettings) {
  if (!settings.desktopToken || !settings.syncFolder) return;

  try {
    const allProjects = await getFilmwaveProjects(settings.desktopToken, settings.apiBaseUrl);
    let projectsToSync = allProjects;
    let updatedProjectIds = new Set(projectsToSync.map((project) => String(project.id)));
    let localChangeSummary = "";

    const localRemovals = await detectLocalRemovals({
      projects: projectsToSync,
      syncFolder: settings.syncFolder,
    });

    if (localRemovals.length > 0) {
      const removalResult = await applyDesktopLocalRemovals({
        apiBaseUrl: settings.apiBaseUrl,
        token: settings.desktopToken,
        removals: localRemovals.map((removal) => ({
          projectId: removal.projectId,
          id: removal.id,
          type: removal.type,
          name: removal.name,
          path: removal.path,
        })),
      });
      const removalProjectIds = new Set(localRemovals.map((removal) => String(removal.projectId)));
      const refreshedProjects = await getFilmwaveProjects(settings.desktopToken, settings.apiBaseUrl);

      projectsToSync = filterProjectsByIds(refreshedProjects, removalProjectIds);
      updatedProjectIds = removalProjectIds;
      localChangeSummary += `Applied ${localRemovals.length} local removal${localRemovals.length === 1 ? "" : "s"}: removed ${removalResult.removedAssetCount} project file${removalResult.removedAssetCount === 1 ? "" : "s"} and ${removalResult.removedFolderCount} folder${removalResult.removedFolderCount === 1 ? "" : "s"}. `;
    }

    const detected = await detectDesktopLocalChanges({
      projects: projectsToSync,
      syncFolder: settings.syncFolder,
    });

    if (hasDesktopLocalChanges(detected.changes)) {
      const changeResult = await applyDesktopLocalChanges({
        apiBaseUrl: settings.apiBaseUrl,
        token: settings.desktopToken,
        changes: detected.changes,
      });
      const changedProjectIds = new Set(detected.affectedProjectIds.map(String));
      const refreshedProjects = await getFilmwaveProjects(settings.desktopToken, settings.apiBaseUrl);

      projectsToSync = filterProjectsByIds(refreshedProjects, changedProjectIds);
      updatedProjectIds = new Set([...updatedProjectIds, ...changedProjectIds]);
      localChangeSummary += `Applied local changes: ${formatLocalChangesSummary(changeResult)}. `;
    }

    if (!localChangeSummary) {
      await addActivityLogEntry({
        mode: "auto",
        status: "info",
        title: "Realtime local sync skipped",
        detail: "No manifest-backed local changes found.",
        projectNames: [],
      });
      return;
    }

    if (projectsToSync.length === 0) {
      await addActivityLogEntry({
        mode: "auto",
        status: "info",
        title: "Realtime local sync skipped",
        detail: `${localChangeSummary}No selected projects needed syncing.`,
        projectNames: [],
      });
      return;
    }

    const result = await syncProjectsToFolder({
      projects: projectsToSync,
      syncFolder: settings.syncFolder,
    });

    dispatchRealtimeUpdated({
      projects: projectsToSync,
      reason: "local",
      updatedProjectIds,
    });

    await addActivityLogEntry({
      mode: "auto",
      status: "success",
      title: "Realtime local sync complete",
      detail: `${localChangeSummary}Skipped ${result.skippedFileCount} unchanged files and downloaded ${result.downloadedFileCount} files.`,
      projectNames: getProjectNames(projectsToSync),
    });
  } catch (error) {
    await addActivityLogEntry({
      mode: "auto",
      status: "error",
      title: "Realtime local sync failed",
      detail: error instanceof Error ? error.message : "Realtime local sync failed.",
      projectNames: [],
    });
  }
}

async function runWebsiteToLocalSync(settings: RealtimeSettings, projectIds = new Set<string>()) {
  if (!settings.desktopToken || !settings.syncFolder) return;

  try {
    const allProjects = await getFilmwaveProjects(settings.desktopToken, settings.apiBaseUrl);
    const projectsToSync = filterProjectsByIds(allProjects, projectIds);
    const updatedProjectIds = new Set(projectsToSync.map((project) => String(project.id)));

    if (projectsToSync.length === 0) {
      await addActivityLogEntry({
        mode: "auto",
        status: "info",
        title: "Realtime website sync skipped",
        detail: "No selected projects needed syncing.",
        projectNames: [],
      });
      return;
    }

    const result = await syncProjectsToFolder({
      projects: projectsToSync,
      syncFolder: settings.syncFolder,
    });

    dispatchRealtimeUpdated({
      projects: projectsToSync,
      reason: "website",
      updatedProjectIds,
    });

    await addActivityLogEntry({
      mode: "auto",
      status: "success",
      title: "Realtime website sync complete",
      detail: `Synced after a Filmwave project change. Skipped ${result.skippedFileCount} unchanged files and downloaded ${result.downloadedFileCount} files.`,
      projectNames: getProjectNames(projectsToSync),
    });
  } catch (error) {
    await addActivityLogEntry({
      mode: "auto",
      status: "error",
      title: "Realtime website sync failed",
      detail: error instanceof Error ? error.message : "Realtime website sync failed.",
      projectNames: [],
    });
  }
}

async function refreshLocalFolderWatch(settings: RealtimeSettings) {
  if (!shouldRunRealtimeSync(settings) || !settings.syncFolder) {
    if (currentWatchedFolder) {
      await invoke("stop_sync_folder_watch", { path: currentWatchedFolder }).catch(() => undefined);
      currentWatchedFolder = null;
    }

    return;
  }

  if (settings.syncFolder === currentWatchedFolder) return;

  if (currentWatchedFolder) {
    await invoke("stop_sync_folder_watch", { path: currentWatchedFolder }).catch(() => undefined);
  }

  await invoke("watch_sync_folder", { path: settings.syncFolder });
  currentWatchedFolder = settings.syncFolder;
}

function closeWebsiteEvents() {
  currentEventSource?.close();
  currentEventSource = null;
}

function refreshWebsiteEvents(settings: RealtimeSettings) {
  closeWebsiteEvents();

  if (!shouldRunRealtimeSync(settings) || !settings.desktopToken) return;

  const url = new URL(`${settings.apiBaseUrl}/api/desktop/projects/events`);
  url.searchParams.set("token", settings.desktopToken);

  const eventSource = new EventSource(url.toString());

  eventSource.addEventListener("project-change", (event) => {
    try {
      const payload = JSON.parse((event as MessageEvent).data) as ProjectChangePayload;
      scheduleWebsiteSync(payload.projectId);
    } catch {
      scheduleWebsiteSync();
    }
  });

  eventSource.onerror = () => {
    closeWebsiteEvents();

    window.setTimeout(async () => {
      const nextSettings = await readSettings();
      refreshWebsiteEvents(nextSettings);
    }, 5000);
  };

  currentEventSource = eventSource;
}

async function refreshRealtimeConnections() {
  const settings = await readSettings();

  await refreshLocalFolderWatch(settings).catch((error) => {
    void addActivityLogEntry({
      mode: "system",
      status: "error",
      title: "Local watcher failed",
      detail: error instanceof Error ? error.message : "Could not watch local sync folder.",
      projectNames: [],
    });
  });

  if (!currentEventSource && shouldRunRealtimeSync(settings)) {
    refreshWebsiteEvents(settings);
  }

  if (!shouldRunRealtimeSync(settings)) {
    closeWebsiteEvents();
  }
}

async function runLocalReconcileSweep() {
  if (syncing || localChangeTimer) return;
  scheduleLocalSync(0);
}

async function runWebsiteReconcileSweep() {
  if (syncing || websiteChangeTimer) return;
  scheduleWebsiteSync();
}

export function startRealtimeSyncController() {
  if (started) return;

  started = true;

  void listen<LocalFolderChangePayload>("filmwave://local-folder-change", (event) => {
    const isRemovalEvent = isRemovalFolderChangeEvent(event.payload);
    scheduleLocalSync(isRemovalEvent ? LOCAL_REMOVE_DEBOUNCE_MS : LOCAL_CHANGE_DEBOUNCE_MS);
  });

  void listen("filmwave://local-folder-watch-error", (event) => {
    void addActivityLogEntry({
      mode: "system",
      status: "error",
      title: "Local watcher error",
      detail: JSON.stringify(event.payload),
      projectNames: [],
    });
  });

  void refreshRealtimeConnections();

  settingsRefreshTimer = window.setInterval(() => {
    void refreshRealtimeConnections();
  }, SETTINGS_REFRESH_MS);

  localReconcileSweepTimer = window.setInterval(() => {
    void runLocalReconcileSweep();
  }, LOCAL_RECONCILE_SWEEP_MS);

  websiteReconcileSweepTimer = window.setInterval(() => {
    void runWebsiteReconcileSweep();
  }, WEBSITE_RECONCILE_SWEEP_MS);
}

export function stopRealtimeSyncController() {
  if (!started) return;

  started = false;
  closeWebsiteEvents();

  if (localChangeTimer) window.clearTimeout(localChangeTimer);
  if (websiteChangeTimer) window.clearTimeout(websiteChangeTimer);
  if (settingsRefreshTimer) window.clearInterval(settingsRefreshTimer);
  if (localReconcileSweepTimer) window.clearInterval(localReconcileSweepTimer);
  if (websiteReconcileSweepTimer) window.clearInterval(websiteReconcileSweepTimer);

  localChangeTimer = null;
  websiteChangeTimer = null;
  settingsRefreshTimer = null;
  localReconcileSweepTimer = null;
  websiteReconcileSweepTimer = null;
  queuedLocalSync = false;
  queuedWebsiteSync = false;
  pendingWebsiteProjectIds.clear();

  if (currentWatchedFolder) {
    void invoke("stop_sync_folder_watch", { path: currentWatchedFolder });
    currentWatchedFolder = null;
  }
}
