import { load } from "@tauri-apps/plugin-store";
import {
  getFilmwaveProjects,
  normalizeFilmwaveApiBaseUrl,
  type Project,
} from "./mockFilmwaveApi";
import { syncProjectsToFolder } from "./syncEngine";

const SETTINGS_STORE = "filmwave-settings.json";
const WEBSITE_CHANGE_DEBOUNCE_MS = 1000;
const SETTINGS_REFRESH_MS = 10000;
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

let started = false;
let currentEventSource: EventSource | null = null;
let websiteChangeTimer: number | null = null;
let settingsRefreshTimer: number | null = null;
let websiteReconcileSweepTimer: number | null = null;
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

  return { apiBaseUrl, autoSyncEnabled, desktopToken, projectSource, syncFolder };
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
  updatedProjectIds,
}: {
  projects: Project[];
  updatedProjectIds: Set<string>;
}) {
  window.dispatchEvent(
    new CustomEvent(REALTIME_UPDATED_EVENT, {
      detail: {
        projectIds: [...updatedProjectIds],
        projects,
        reason: "website",
        updatedAt: new Date().toISOString(),
      },
    }),
  );
}

function queueAfterSync(projectIds = new Set<string>()) {
  queuedWebsiteSync = true;
  projectIds.forEach((id) => pendingWebsiteProjectIds.add(id));
}

function runQueuedSyncs() {
  if (syncing) return;

  if (queuedWebsiteSync) {
    queuedWebsiteSync = false;
    scheduleWebsiteSync();
  }
}

function scheduleWebsiteSync(projectId?: string | number) {
  if (projectId != null) {
    pendingWebsiteProjectIds.add(String(projectId));
  }

  if (websiteChangeTimer) window.clearTimeout(websiteChangeTimer);

  websiteChangeTimer = window.setTimeout(() => {
    const projectIds = new Set(pendingWebsiteProjectIds);
    pendingWebsiteProjectIds.clear();
    websiteChangeTimer = null;
    void runWebsiteSync(projectIds);
  }, WEBSITE_CHANGE_DEBOUNCE_MS);
}

async function runWebsiteSync(projectIds = new Set<string>()) {
  if (syncing) {
    queueAfterSync(projectIds);
    return;
  }

  const syncGapRemainingMs = MIN_SYNC_GAP_MS - (Date.now() - lastSyncFinishedAt);

  if (syncGapRemainingMs > 0) {
    projectIds.forEach((id) => pendingWebsiteProjectIds.add(id));
    scheduleWebsiteSync();
    return;
  }

  const settings = await readSettings();

  if (!shouldRunRealtimeSync(settings)) return;
  if (!settings.desktopToken || !settings.syncFolder) return;

  syncing = true;

  try {
    await runWebsiteToLocalSync(settings, projectIds);
  } finally {
    syncing = false;
    lastSyncFinishedAt = Date.now();
    runQueuedSyncs();
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
        title: "Realtime sync skipped",
        detail: "No projects needed syncing.",
        projectNames: [],
      });
      return;
    }

    const result = await syncProjectsToFolder({
      projects: projectsToSync,
      syncFolder: settings.syncFolder,
    });

    dispatchRealtimeUpdated({ projects: projectsToSync, updatedProjectIds });

    await addActivityLogEntry({
      mode: "auto",
      status: "success",
      title: "Realtime sync complete",
      detail: `Synced after a Filmwave project change. Skipped ${result.skippedFileCount} unchanged files and downloaded ${result.downloadedFileCount} files.`,
      projectNames: getProjectNames(projectsToSync),
    });
  } catch (error) {
    await addActivityLogEntry({
      mode: "auto",
      status: "error",
      title: "Realtime sync failed",
      detail: error instanceof Error ? error.message : "Realtime sync failed.",
      projectNames: [],
    });
  }
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

  if (!currentEventSource && shouldRunRealtimeSync(settings)) {
    refreshWebsiteEvents(settings);
  }

  if (!shouldRunRealtimeSync(settings)) {
    closeWebsiteEvents();
  }
}

async function runWebsiteReconcileSweep() {
  if (syncing || websiteChangeTimer) return;
  scheduleWebsiteSync();
}

export function startRealtimeSyncController() {
  if (started) return;

  started = true;

  // The local sync folder is read-only — changes flow website → local only.
  // No filesystem watcher or local change detection is registered here.

  void refreshRealtimeConnections();

  settingsRefreshTimer = window.setInterval(() => {
    void refreshRealtimeConnections();
  }, SETTINGS_REFRESH_MS);

  websiteReconcileSweepTimer = window.setInterval(() => {
    void runWebsiteReconcileSweep();
  }, WEBSITE_RECONCILE_SWEEP_MS);
}

export function stopRealtimeSyncController() {
  if (!started) return;

  started = false;
  closeWebsiteEvents();

  if (websiteChangeTimer) window.clearTimeout(websiteChangeTimer);
  if (settingsRefreshTimer) window.clearInterval(settingsRefreshTimer);
  if (websiteReconcileSweepTimer) window.clearInterval(websiteReconcileSweepTimer);

  websiteChangeTimer = null;
  settingsRefreshTimer = null;
  websiteReconcileSweepTimer = null;
  queuedWebsiteSync = false;
  pendingWebsiteProjectIds.clear();
}
