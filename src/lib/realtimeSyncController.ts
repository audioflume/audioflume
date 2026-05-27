import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import {
  applyDesktopLocalChanges,
  getFilmwaveProjects,
  normalizeFilmwaveApiBaseUrl,
  type Project,
} from "./mockFilmwaveApi";
import {
  detectDesktopLocalChanges,
  hasDesktopLocalChanges,
} from "./localFolderChanges";
import { formatLocalChangesSummary } from "./localChangeDetector";
import { syncProjectsToFolder } from "./syncEngine";

const SETTINGS_STORE = "filmwave-settings.json";
const LOCAL_CHANGE_DEBOUNCE_MS = 3500;
const WEBSITE_CHANGE_DEBOUNCE_MS = 2500;
const POST_SYNC_SUPPRESS_MS = 10000;
const SETTINGS_REFRESH_MS = 10000;
const MIN_SYNC_GAP_MS = 2500;

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

let started = false;
let currentWatchedFolder: string | null = null;
let currentEventSource: EventSource | null = null;
let localChangeTimer: number | null = null;
let websiteChangeTimer: number | null = null;
let settingsRefreshTimer: number | null = null;
let syncing = false;
let suppressLocalChangesUntil = 0;
let lastSyncStartedAt = 0;
let pendingWebsiteProjectIds = new Set<string>();

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
  reason: "local" | "website";
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

async function runEventDrivenSync(reason: "local" | "website", projectIds = new Set<string>()) {
  if (syncing) return;
  if (Date.now() - lastSyncStartedAt < MIN_SYNC_GAP_MS) return;

  const settings = await readSettings();

  if (!shouldRunRealtimeSync(settings)) return;
  if (!settings.desktopToken || !settings.syncFolder) return;

  syncing = true;
  lastSyncStartedAt = Date.now();

  try {
    const allProjects = await getFilmwaveProjects(settings.desktopToken, settings.apiBaseUrl);
    const initialProjects = filterProjectsByIds(allProjects, projectIds);
    let projectsToSync = initialProjects;
    let localChangeSummary = "";
    let updatedProjectIds = new Set(projectsToSync.map((project) => String(project.id)));

    if (reason === "local") {
      const detected = await detectDesktopLocalChanges({
        projects: initialProjects,
        syncFolder: settings.syncFolder,
      });

      if (hasDesktopLocalChanges(detected.changes)) {
        const changeResult = await applyDesktopLocalChanges({
          apiBaseUrl: settings.apiBaseUrl,
          token: settings.desktopToken,
          changes: detected.changes,
        });

        localChangeSummary = `Applied local changes: ${formatLocalChangesSummary(changeResult)}. `;

        const changedProjectIds = new Set(detected.affectedProjectIds.map(String));
        const refreshedProjects = await getFilmwaveProjects(settings.desktopToken, settings.apiBaseUrl);
        projectsToSync = filterProjectsByIds(refreshedProjects, changedProjectIds);
        updatedProjectIds = changedProjectIds;
      } else {
        localChangeSummary = "No manifest-backed local changes found. ";
      }
    }

    if (projectsToSync.length === 0) {
      await addActivityLogEntry({
        mode: "auto",
        status: "info",
        title: reason === "local" ? "Realtime local sync skipped" : "Realtime website sync skipped",
        detail: `${localChangeSummary}No selected projects needed syncing.`,
        projectNames: [],
      });
      return;
    }

    const result = await syncProjectsToFolder({
      projects: projectsToSync,
      syncFolder: settings.syncFolder,
    });

    suppressLocalChangesUntil = Date.now() + POST_SYNC_SUPPRESS_MS;
    dispatchRealtimeUpdated({
      projects: projectsToSync,
      reason,
      updatedProjectIds,
    });

    await addActivityLogEntry({
      mode: "auto",
      status: "success",
      title: reason === "local" ? "Realtime local sync complete" : "Realtime website sync complete",
      detail: `${localChangeSummary}Synced after ${reason === "local" ? "a local folder change" : "a Filmwave project change"}. Skipped ${result.skippedFileCount} unchanged files and downloaded ${result.downloadedFileCount} files.`,
      projectNames: getProjectNames(projectsToSync),
    });
  } catch (error) {
    await addActivityLogEntry({
      mode: "auto",
      status: "error",
      title: reason === "local" ? "Realtime local sync failed" : "Realtime website sync failed",
      detail: error instanceof Error ? error.message : "Realtime sync failed.",
      projectNames: [],
    });
  } finally {
    syncing = false;
  }
}

function scheduleLocalSync() {
  if (Date.now() < suppressLocalChangesUntil || syncing) return;

  if (localChangeTimer) {
    window.clearTimeout(localChangeTimer);
  }

  localChangeTimer = window.setTimeout(() => {
    localChangeTimer = null;
    void runEventDrivenSync("local");
  }, LOCAL_CHANGE_DEBOUNCE_MS);
}

function scheduleWebsiteSync(projectId?: string | number) {
  if (projectId != null) {
    pendingWebsiteProjectIds.add(String(projectId));
  }

  if (websiteChangeTimer) {
    window.clearTimeout(websiteChangeTimer);
  }

  websiteChangeTimer = window.setTimeout(() => {
    const projectIds = new Set(pendingWebsiteProjectIds);
    pendingWebsiteProjectIds.clear();
    websiteChangeTimer = null;
    void runEventDrivenSync("website", projectIds);
  }, WEBSITE_CHANGE_DEBOUNCE_MS);
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

export function startRealtimeSyncController() {
  if (started) return;

  started = true;

  void listen("filmwave://local-folder-change", () => {
    scheduleLocalSync();
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
}

export function stopRealtimeSyncController() {
  if (!started) return;

  started = false;
  closeWebsiteEvents();

  if (localChangeTimer) window.clearTimeout(localChangeTimer);
  if (websiteChangeTimer) window.clearTimeout(websiteChangeTimer);
  if (settingsRefreshTimer) window.clearInterval(settingsRefreshTimer);

  localChangeTimer = null;
  websiteChangeTimer = null;
  settingsRefreshTimer = null;

  if (currentWatchedFolder) {
    void invoke("stop_sync_folder_watch", { path: currentWatchedFolder });
    currentWatchedFolder = null;
  }
}
