import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { useEffect, useMemo, useState } from "react";
import { register } from "@tauri-apps/plugin-deep-link";
import { open } from "@tauri-apps/plugin-dialog";
import { load } from "@tauri-apps/plugin-store";
import {
  DEFAULT_FILMWAVE_API_BASE_URL,
  applyDesktopLocalRemovals,
  getDesktopAccount,
  getDesktopAuthTokenUrl,
  getFilmwaveProjects,
  getMockProjects,
  normalizeFilmwaveApiBaseUrl,
  type DesktopAccount,
  type Project,
} from "./lib/mockFilmwaveApi";
import {
  detectLocalRemovals,
  formatSyncReport,
  getProjectFolderPath,
  syncProjectsToFolder,
  type LocalRemoval,
  type SyncProgress,
} from "./lib/syncEngine";
import "./App.css";

const SETTINGS_STORE = "filmwave-settings.json";
const DEFAULT_AUTO_SYNC_INTERVAL_MINUTES = 15;

type ProjectSource = "mock" | "local-api";
type SyncRunOptions = {
  automatic?: boolean;
};

function formatRefreshTime(date: Date | null) {
  if (!date) return "Not refreshed yet";

  return `Last refreshed ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function formatAutoSyncTime(date: Date | null) {
  if (!date) return "Auto-sync has not run yet";

  return `Last auto-sync ${date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function getTokenFromDeepLink(url: string) {
  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.protocol !== "filmwave:") return null;
    if (parsedUrl.hostname !== "auth") return null;

    return parsedUrl.searchParams.get("token");
  } catch {
    return null;
  }
}

function getDeepLinkUrls(payload: unknown) {
  if (Array.isArray(payload)) {
    return payload.filter((item): item is string => typeof item === "string");
  }

  return typeof payload === "string" ? [payload] : [];
}

function getAccountInitial(account: DesktopAccount | null) {
  const value = account?.name || account?.email || "F";
  return value.trim().charAt(0).toUpperCase() || "F";
}

function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(true);
  const [projectSource, setProjectSource] = useState<ProjectSource>("mock");
  const [apiBaseUrl, setApiBaseUrl] = useState(DEFAULT_FILMWAVE_API_BASE_URL);
  const [apiBaseUrlDraft, setApiBaseUrlDraft] = useState(DEFAULT_FILMWAVE_API_BASE_URL);
  const [syncFolder, setSyncFolder] = useState<string | null>(null);
  const [lastSyncedFolder, setLastSyncedFolder] = useState<string | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [desktopToken, setDesktopToken] = useState<string | null>(null);
  const [connectionCode, setConnectionCode] = useState("");
  const [desktopAccount, setDesktopAccount] = useState<DesktopAccount | null>(null);
  const [accountLoading, setAccountLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState("Not connected");
  const [syncing, setSyncing] = useState(false);
  const [openingFolder, setOpeningFolder] = useState(false);
  const [checkingLocalRemovals, setCheckingLocalRemovals] = useState(false);
  const [applyingLocalRemovals, setApplyingLocalRemovals] = useState(false);
  const [localRemovals, setLocalRemovals] = useState<LocalRemoval[]>([]);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [autoSyncIntervalMinutes, setAutoSyncIntervalMinutes] = useState(
    DEFAULT_AUTO_SYNC_INTERVAL_MINUTES,
  );
  const [lastAutoSyncedAt, setLastAutoSyncedAt] = useState<Date | null>(null);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [lastSyncReport, setLastSyncReport] = useState<string | null>(null);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);

  const hasSelectedProjects = selectedProjectIds.length > 0;
  const isSignedIn = Boolean(desktopToken);
  const normalizedApiBaseUrl = useMemo(
    () => normalizeFilmwaveApiBaseUrl(apiBaseUrl),
    [apiBaseUrl],
  );
  const canSync =
    Boolean(syncFolder) && hasSelectedProjects && !projectsLoading && !syncing;
  const canAutoSync =
    autoSyncEnabled &&
    Boolean(syncFolder) &&
    hasSelectedProjects &&
    projectSource === "local-api" &&
    Boolean(desktopToken);
  const selectedProjects = useMemo(() => {
    const selectedProjectIdSet = new Set(selectedProjectIds);

    return projects.filter((project) => selectedProjectIdSet.has(project.id));
  }, [projects, selectedProjectIds]);

  const selectedSummary = useMemo(() => {
    if (projectsLoading) {
      return "Loading projects...";
    }

    if (!hasSelectedProjects) {
      return "No projects selected";
    }

    const selectedCount = selectedProjectIds.length;
    const label = selectedCount === 1 ? "project" : "projects";

    return `${selectedCount} ${label} selected`;
  }, [hasSelectedProjects, projectsLoading, selectedProjectIds.length]);

  const sourceDescription =
    projectSource === "mock"
      ? "Using local sample data"
      : isSignedIn
        ? `Using ${normalizedApiBaseUrl}`
        : `Sign in to load projects from ${normalizedApiBaseUrl}`;

  const accountDescription = isSignedIn
    ? desktopAccount
      ? `Signed in as ${desktopAccount.name}`
      : accountLoading
        ? "Loading your Filmwave account..."
        : "Filmwave Desktop is connected."
    : "Connect with your normal Filmwave sign-in to access your real project files.";

  const autoSyncDescription = autoSyncEnabled
    ? `Every ${autoSyncIntervalMinutes} minutes. Local removals are automatically applied to Filmwave projects only.`
    : "Off. Manual sync and manual local-removal checks are still available.";

  const syncProgressPercent = syncProgress?.totalFiles
    ? Math.round((syncProgress.completedFiles / syncProgress.totalFiles) * 100)
    : 0;

  async function loadDesktopAccount(token: string, nextApiBaseUrl = normalizedApiBaseUrl) {
    setAccountLoading(true);

    try {
      const account = await getDesktopAccount(token, nextApiBaseUrl);
      setDesktopAccount(account);
      return account;
    } catch (error) {
      console.error(error);
      setDesktopAccount(null);
      setLastSyncReport(
        error instanceof Error
          ? error.message
          : "Could not load Filmwave account.",
      );
      return null;
    } finally {
      setAccountLoading(false);
    }
  }

  async function saveDesktopToken(nextToken: string) {
    const store = await load(SETTINGS_STORE);

    setDesktopToken(nextToken);
    setConnectionCode("");
    setProjectSource("local-api");
    setSelectedProjectIds([]);
    setLocalRemovals([]);
    setLastRefreshedAt(null);
    setLastSyncReport(null);
    setSyncStatus("Signed in");

    await store.set("desktopToken", nextToken);
    await store.set("projectSource", "local-api");
    await store.save();

    await loadDesktopAccount(nextToken);
  }

  async function connectWithConnectionCode() {
    const nextToken = connectionCode.trim();

    if (!nextToken) {
      setSyncStatus("Paste a connection code first");
      return;
    }

    await saveDesktopToken(nextToken);
  }

  async function fetchProjects() {
    return projectSource === "local-api"
      ? await getFilmwaveProjects(desktopToken, normalizedApiBaseUrl)
      : await getMockProjects();
  }

  async function refreshProjectList({
    clearReport = true,
    statusLabel = "Refreshing projects...",
  }: {
    clearReport?: boolean;
    statusLabel?: string;
  } = {}) {
    setProjectsLoading(true);

    if (clearReport) {
      setLastSyncReport(null);
    }

    setSyncStatus(statusLabel);

    try {
      const nextProjects = await fetchProjects();
      const nextProjectIds = new Set(nextProjects.map((project) => project.id));

      setProjects(nextProjects);
      setSelectedProjectIds((current) =>
        current.filter((projectId) => nextProjectIds.has(projectId)),
      );
      setLastRefreshedAt(new Date());
      setSyncStatus(
        projectSource === "local-api" ? "Filmwave loaded" : "Mock data loaded",
      );

      return nextProjects;
    } catch (error) {
      console.error(error);
      setProjects([]);
      setSelectedProjectIds([]);
      setLocalRemovals([]);
      setSyncStatus("Could not load projects");
      setLastSyncReport(
        error instanceof Error
          ? error.message
          : "Could not load Filmwave projects.",
      );

      throw error;
    } finally {
      setProjectsLoading(false);
    }
  }

  useEffect(() => {
    register("filmwave").catch((error) => {
      console.warn("Could not register Filmwave deep link scheme.", error);
    });
  }, []);

  useEffect(() => {
    async function loadSavedSettings() {
      const store = await load(SETTINGS_STORE);
      const savedFolder = await store.get<string>("syncFolder");
      const savedProjectSource =
        await store.get<ProjectSource>("projectSource");
      const savedLastSyncedFolder = await store.get<string>("lastSyncedFolder");
      const savedDesktopToken = await store.get<string>("desktopToken");
      const savedApiBaseUrl = await store.get<string>("apiBaseUrl");
      const savedAutoSyncEnabled = await store.get<boolean>("autoSyncEnabled");
      const savedAutoSyncIntervalMinutes = await store.get<number>(
        "autoSyncIntervalMinutes",
      );
      const nextApiBaseUrl = normalizeFilmwaveApiBaseUrl(savedApiBaseUrl);

      setApiBaseUrl(nextApiBaseUrl);
      setApiBaseUrlDraft(nextApiBaseUrl);
      setAutoSyncEnabled(Boolean(savedAutoSyncEnabled));

      if (
        savedAutoSyncIntervalMinutes === 5 ||
        savedAutoSyncIntervalMinutes === 15 ||
        savedAutoSyncIntervalMinutes === 30
      ) {
        setAutoSyncIntervalMinutes(savedAutoSyncIntervalMinutes);
      }

      if (savedFolder) {
        setSyncFolder(savedFolder);
        setSyncStatus("Folder ready");
      }

      if (savedLastSyncedFolder) {
        setLastSyncedFolder(savedLastSyncedFolder);
      }

      if (savedDesktopToken) {
        setDesktopToken(savedDesktopToken);
        void loadDesktopAccount(savedDesktopToken, nextApiBaseUrl);
      }

      if (savedProjectSource === "mock" || savedProjectSource === "local-api") {
        setProjectSource(savedProjectSource);
      }
    }

    loadSavedSettings();
  }, []);

  useEffect(() => {
    async function handleDeepLinkUrl(url: string) {
      const token = getTokenFromDeepLink(url);

      if (!token) return;

      await saveDesktopToken(token);
    }

    let unlisten: (() => void) | undefined;

    listen<unknown>("deep-link://new-url", async (event) => {
      for (const url of getDeepLinkUrls(event.payload)) {
        await handleDeepLinkUrl(url);
      }
    }).then((nextUnlisten) => {
      unlisten = nextUnlisten;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialProjects() {
      setProjectsLoading(true);
      setLastSyncReport(null);

      if (projectSource === "local-api" && !desktopToken) {
        setProjects([]);
        setSelectedProjectIds([]);
        setLocalRemovals([]);
        setSyncStatus("Sign in required");
        setProjectsLoading(false);
        return;
      }

      try {
        const nextProjects = await fetchProjects();

        if (cancelled) return;

        const nextProjectIds = new Set(
          nextProjects.map((project) => project.id),
        );

        setProjects(nextProjects);
        setSelectedProjectIds((current) =>
          current.filter((projectId) => nextProjectIds.has(projectId)),
        );
        setLastRefreshedAt(new Date());
        setSyncStatus(
          projectSource === "local-api"
            ? "Filmwave loaded"
            : "Mock data loaded",
        );
      } catch (error) {
        if (cancelled) return;

        console.error(error);
        setProjects([]);
        setSelectedProjectIds([]);
        setLocalRemovals([]);
        setSyncStatus("Could not load projects");
        setLastSyncReport(
          error instanceof Error
            ? error.message
            : "Could not load Filmwave projects.",
        );
      } finally {
        if (!cancelled) {
          setProjectsLoading(false);
        }
      }
    }

    loadInitialProjects();

    return () => {
      cancelled = true;
    };
  }, [projectSource, desktopToken, normalizedApiBaseUrl]);

  useEffect(() => {
    if (!canAutoSync) return;

    const intervalId = window.setInterval(() => {
      if (
        syncing ||
        projectsLoading ||
        checkingLocalRemovals ||
        applyingLocalRemovals
      ) {
        return;
      }

      void syncSelectedProjects({ automatic: true });
    }, autoSyncIntervalMinutes * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [
    applyingLocalRemovals,
    autoSyncIntervalMinutes,
    canAutoSync,
    checkingLocalRemovals,
    normalizedApiBaseUrl,
    projects,
    projectsLoading,
    selectedProjectIds,
    syncFolder,
    syncing,
  ]);

  async function chooseSyncFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose Filmwave sync folder",
    });

    if (typeof selected === "string") {
      const store = await load(SETTINGS_STORE);

      setSyncFolder(selected);
      setLocalRemovals([]);
      setSyncStatus("Folder ready");

      await store.set("syncFolder", selected);
      await store.save();
    }
  }

  async function changeProjectSource(nextSource: ProjectSource) {
    if (nextSource === projectSource) return;

    const store = await load(SETTINGS_STORE);

    setSelectedProjectIds([]);
    setSyncProgress(null);
    setLocalRemovals([]);
    setLastSyncReport(null);
    setLastRefreshedAt(null);
    setProjectSource(nextSource);
    await store.set("projectSource", nextSource);
    await store.save();
  }

  async function changeAutoSyncEnabled(nextEnabled: boolean) {
    const store = await load(SETTINGS_STORE);

    setAutoSyncEnabled(nextEnabled);
    setSyncStatus(nextEnabled ? "Auto-sync enabled" : "Auto-sync off");

    await store.set("autoSyncEnabled", nextEnabled);
    await store.save();
  }

  async function changeAutoSyncInterval(nextInterval: number) {
    const store = await load(SETTINGS_STORE);

    setAutoSyncIntervalMinutes(nextInterval);
    setSyncStatus(`Auto-sync every ${nextInterval} minutes`);

    await store.set("autoSyncIntervalMinutes", nextInterval);
    await store.save();
  }

  async function saveApiBaseUrl() {
    const nextApiBaseUrl = normalizeFilmwaveApiBaseUrl(apiBaseUrlDraft);
    const store = await load(SETTINGS_STORE);

    setApiBaseUrl(nextApiBaseUrl);
    setApiBaseUrlDraft(nextApiBaseUrl);
    setSelectedProjectIds([]);
    setLocalRemovals([]);
    setLastRefreshedAt(null);
    setLastSyncReport(null);
    setProjects([]);
    setSyncStatus("API URL saved");

    await store.set("apiBaseUrl", nextApiBaseUrl);
    await store.save();

    if (desktopToken) {
      await loadDesktopAccount(desktopToken, nextApiBaseUrl);
    }
  }

  async function resetApiBaseUrl() {
    setApiBaseUrlDraft(DEFAULT_FILMWAVE_API_BASE_URL);
    const store = await load(SETTINGS_STORE);

    setApiBaseUrl(DEFAULT_FILMWAVE_API_BASE_URL);
    setSelectedProjectIds([]);
    setLocalRemovals([]);
    setLastRefreshedAt(null);
    setLastSyncReport(null);
    setProjects([]);
    setSyncStatus("Using local API");

    await store.set("apiBaseUrl", DEFAULT_FILMWAVE_API_BASE_URL);
    await store.save();
  }

  async function openSignInPage() {
    try {
      await invoke("open_path", { path: getDesktopAuthTokenUrl(normalizedApiBaseUrl) });
      setSyncStatus("Sign in opened");
      setLastSyncReport("Finish signing in in your browser. If the desktop app does not connect automatically, copy the connection code from the browser and paste it here.");
    } catch (error) {
      console.error(error);
      setSyncStatus("Could not open sign in");
      setLastSyncReport(
        error instanceof Error ? error.message : "Could not open Filmwave sign in.",
      );
    }
  }

  async function signOutDesktop() {
    const store = await load(SETTINGS_STORE);

    setDesktopToken(null);
    setConnectionCode("");
    setDesktopAccount(null);
    setProjects([]);
    setSelectedProjectIds([]);
    setLocalRemovals([]);
    setLastRefreshedAt(null);
    setSyncProgress(null);
    setLastSyncReport(null);
    setSyncStatus("Signed out");

    await store.delete("desktopToken");
    await store.save();
  }

  async function refreshProjects() {
    if (syncing || projectsLoading) return;

    if (projectSource === "local-api" && !desktopToken) {
      setSyncStatus("Sign in required");
      return;
    }

    try {
      await refreshProjectList();
      setLocalRemovals([]);
    } catch {
      // refreshProjectList already updates visible error state.
    }
  }

  async function checkLocalRemovals() {
    if (!syncFolder) {
      setSyncStatus("Choose a sync folder first");
      return;
    }

    if (!hasSelectedProjects) {
      setSyncStatus("Select a project first");
      return;
    }

    if (projectSource !== "local-api") {
      setSyncStatus("Use Filmwave source first");
      return;
    }

    try {
      setCheckingLocalRemovals(true);
      setLastSyncReport(null);
      setSyncStatus("Checking local removals...");

      const removals = await detectLocalRemovals({
        projects: selectedProjects,
        syncFolder,
      });

      setLocalRemovals(removals);
      setSyncStatus(removals.length > 0 ? "Local removals found" : "No local removals");
      setLastSyncReport(
        removals.length > 0
          ? `${removals.length} local removal${removals.length === 1 ? "" : "s"} detected. Review and apply them to remove those items from the Filmwave project only.`
          : "No local removals were detected for the selected projects.",
      );
    } catch (error) {
      console.error(error);
      setSyncStatus("Local check failed");
      setLastSyncReport(
        error instanceof Error
          ? error.message
          : "Could not check local removals.",
      );
    } finally {
      setCheckingLocalRemovals(false);
    }
  }

  async function applyLocalRemovals() {
    if (!desktopToken) {
      setSyncStatus("Sign in required");
      return;
    }

    if (!syncFolder) {
      setSyncStatus("Choose a sync folder first");
      return;
    }

    if (localRemovals.length === 0) {
      setSyncStatus("No local removals");
      return;
    }

    try {
      setApplyingLocalRemovals(true);
      setSyncing(true);
      setLastSyncReport(null);
      setSyncProgress(null);
      setSyncStatus("Applying local removals...");

      const removalResult = await applyDesktopLocalRemovals({
        apiBaseUrl: normalizedApiBaseUrl,
        token: desktopToken,
        removals: localRemovals.map((removal) => ({
          projectId: removal.projectId,
          id: removal.id,
          type: removal.type,
        })),
      });

      setLocalRemovals([]);

      const latestProjects = await refreshProjectList({
        clearReport: false,
        statusLabel: "Refreshing after local removals...",
      });
      const selectedProjectIdSet = new Set(selectedProjectIds);
      const latestSelectedProjects = latestProjects.filter((project) =>
        selectedProjectIdSet.has(project.id),
      );

      if (latestSelectedProjects.length > 0) {
        setSyncStatus("Updating local manifest...");
        const syncResult = await syncProjectsToFolder({
          projects: latestSelectedProjects,
          syncFolder,
          onProgress: setSyncProgress,
        });

        setLastSyncReport(
          `Applied local removals to Filmwave. Removed ${removalResult.removedAssetCount} project file${removalResult.removedAssetCount === 1 ? "" : "s"} and ${removalResult.removedFolderCount} folder${removalResult.removedFolderCount === 1 ? "" : "s"}. ${formatSyncReport(syncResult)}`,
        );
      } else {
        setLastSyncReport(
          `Applied local removals to Filmwave. Removed ${removalResult.removedAssetCount} project file${removalResult.removedAssetCount === 1 ? "" : "s"} and ${removalResult.removedFolderCount} folder${removalResult.removedFolderCount === 1 ? "" : "s"}.`,
        );
      }

      setSyncStatus("Local removals applied");
    } catch (error) {
      console.error(error);
      setSyncStatus("Apply failed");
      setLastSyncReport(
        error instanceof Error
          ? error.message
          : "Could not apply local removals.",
      );
    } finally {
      setApplyingLocalRemovals(false);
      setSyncing(false);
    }
  }

  function toggleProject(projectId: string) {
    setSelectedProjectIds((current) => {
      if (current.includes(projectId)) {
        return current.filter((id) => id !== projectId);
      }

      return [...current, projectId];
    });
    setLocalRemovals([]);
  }

  async function openLastSyncedFolder() {
    if (!lastSyncedFolder || openingFolder) return;

    try {
      setOpeningFolder(true);
      await invoke("open_path", { path: lastSyncedFolder });
    } catch (error) {
      console.error(error);
      setSyncStatus("Could not open folder");
      setLastSyncReport(
        error instanceof Error
          ? error.message
          : "Could not open the synced folder.",
      );
    } finally {
      window.setTimeout(() => setOpeningFolder(false), 500);
    }
  }

  async function syncSelectedProjects(options: SyncRunOptions = {}) {
    if (!syncFolder) {
      if (!options.automatic) setSyncStatus("Choose a sync folder first");
      return;
    }

    if (selectedProjectIds.length === 0) {
      if (!options.automatic) setSyncStatus("Select a project first");
      return;
    }

    if (projectSource === "local-api" && !desktopToken) {
      if (!options.automatic) setSyncStatus("Sign in required");
      return;
    }

    try {
      setSyncing(true);
      setSyncStatus(options.automatic ? "Auto-syncing..." : "Checking local removals...");
      setLastSyncReport(null);
      setLocalRemovals([]);
      setSyncProgress(null);

      let autoRemovalSummary = "";

      if (projectSource === "local-api" && desktopToken) {
        const removals = await detectLocalRemovals({
          projects: selectedProjects,
          syncFolder,
        });

        if (removals.length > 0) {
          setSyncStatus("Applying local removals...");

          const removalResult = await applyDesktopLocalRemovals({
            apiBaseUrl: normalizedApiBaseUrl,
            token: desktopToken,
            removals: removals.map((removal) => ({
              projectId: removal.projectId,
              id: removal.id,
              type: removal.type,
            })),
          });

          autoRemovalSummary = `Applied ${removals.length} local removal${removals.length === 1 ? "" : "s"} to Filmwave. Removed ${removalResult.removedAssetCount} project file${removalResult.removedAssetCount === 1 ? "" : "s"} and ${removalResult.removedFolderCount} folder${removalResult.removedFolderCount === 1 ? "" : "s"}. `;
        }
      }

      setSyncStatus("Refreshing projects...");

      const latestProjects = await refreshProjectList({
        clearReport: false,
        statusLabel: "Refreshing projects...",
      });

      const selectedProjectIdSet = new Set(selectedProjectIds);
      const latestSelectedProjects = latestProjects.filter((project) =>
        selectedProjectIdSet.has(project.id),
      );

      if (latestSelectedProjects.length === 0) {
        setSyncStatus("Select a project first");
        setLastSyncReport(
          "The selected project is no longer available. Choose a project and sync again.",
        );
        return;
      }

      setSyncStatus(options.automatic ? "Auto-syncing..." : "Syncing...");
      setSyncProgress({
        phase: "preparing",
        message: "Preparing sync...",
        completedFiles: 0,
        totalFiles: latestSelectedProjects.reduce(
          (total, project) =>
            total + project.files.filter((node) => node.type === "file").length,
          0,
        ),
      });

      const result = await syncProjectsToFolder({
        projects: latestSelectedProjects,
        syncFolder,
        onProgress: setSyncProgress,
      });

      const nextLastSyncedFolder =
        latestSelectedProjects.length === 1
          ? getProjectFolderPath(syncFolder, latestSelectedProjects[0])
          : syncFolder;
      const store = await load(SETTINGS_STORE);

      setLastSyncedFolder(nextLastSyncedFolder);
      await store.set("lastSyncedFolder", nextLastSyncedFolder);
      await store.save();

      if (options.automatic) {
        setLastAutoSyncedAt(new Date());
      }

      setSyncStatus(options.automatic ? "Auto-synced" : "Synced");
      setLastSyncReport(`${autoRemovalSummary}${formatSyncReport(result)}`);
    } catch (error) {
      console.error(error);
      setSyncStatus(options.automatic ? "Auto-sync failed" : "Sync failed");
      setLastSyncReport(
        error instanceof Error
          ? error.message
          : "An unknown sync error occurred.",
      );
    } finally {
      setSyncing(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="sync-card">
        <div className="eyebrow">Filmwave Desktop</div>

        <div className="header-row">
          <div>
            <h1>Sync your project music</h1>
            <p>
              Keep selected Filmwave project files available locally for
              editing, dragging, and offline access.
            </p>
          </div>

          <div className={`status-pill ${syncing ? "is-syncing" : ""}`}>
            <span className="status-dot" />
            {syncStatus}
          </div>
        </div>

        <div className="section-block account-block">
          <div>
            <h2>Account</h2>
            <p>{accountDescription}</p>
            {!isSignedIn && (
              <div className="token-form">
                <input
                  type="password"
                  value={connectionCode}
                  onChange={(event) => setConnectionCode(event.target.value)}
                  placeholder="Paste connection code"
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="secondary-button"
                  onClick={connectWithConnectionCode}
                >
                  Connect
                </button>
              </div>
            )}
            {isSignedIn && (
              <div className="account-profile">
                <div className="account-avatar">
                  {desktopAccount?.imageUrl ? (
                    <img src={desktopAccount.imageUrl} alt="" />
                  ) : (
                    getAccountInitial(desktopAccount)
                  )}
                </div>
                <div className="account-profile-main">
                  <span className="account-name">
                    {desktopAccount?.name ??
                      (accountLoading ? "Loading account..." : "Filmwave user")}
                  </span>
                  <span className="account-email">
                    {desktopAccount?.email ?? "Connected to Filmwave"}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="button-group">
            <button
              type="button"
              className="primary-button"
              onClick={openSignInPage}
            >
              {isSignedIn ? "Reconnect" : "Sign in"}
            </button>
            {isSignedIn && (
              <button
                type="button"
                className="secondary-button"
                onClick={signOutDesktop}
              >
                Sign out
              </button>
            )}
          </div>
        </div>

        <div className="section-block">
          <div>
            <h2>Project source</h2>
            <p>{sourceDescription}</p>
          </div>

          <div className="source-toggle" aria-label="Project data source">
            <button
              type="button"
              className={projectSource === "mock" ? "is-active" : ""}
              onClick={() => changeProjectSource("mock")}
            >
              Mock
            </button>
            <button
              type="button"
              className={projectSource === "local-api" ? "is-active" : ""}
              onClick={() => changeProjectSource("local-api")}
            >
              Filmwave
            </button>
          </div>
        </div>

        <div className="section-block settings-block">
          <div>
            <h2>API endpoint</h2>
            <p className="folder-path">{normalizedApiBaseUrl}</p>
          </div>

          <div className="settings-form">
            <input
              type="url"
              value={apiBaseUrlDraft}
              onChange={(event) => setApiBaseUrlDraft(event.target.value)}
              placeholder="https://your-filmwave-domain.com"
              autoComplete="off"
            />
            <button
              type="button"
              className="secondary-button"
              onClick={saveApiBaseUrl}
            >
              Save
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={resetApiBaseUrl}
            >
              Local
            </button>
          </div>
        </div>

        <div className="section-block settings-block">
          <div>
            <h2>Auto-sync</h2>
            <p>{autoSyncDescription}</p>
            <p className="refresh-meta">{formatAutoSyncTime(lastAutoSyncedAt)}</p>
          </div>

          <div className="button-group">
            <button
              type="button"
              className={autoSyncEnabled ? "primary-button" : "secondary-button"}
              onClick={() => changeAutoSyncEnabled(!autoSyncEnabled)}
            >
              {autoSyncEnabled ? "On" : "Off"}
            </button>
            {[5, 15, 30].map((interval) => (
              <button
                key={interval}
                type="button"
                className={
                  autoSyncIntervalMinutes === interval
                    ? "primary-button"
                    : "secondary-button"
                }
                onClick={() => changeAutoSyncInterval(interval)}
              >
                {interval}m
              </button>
            ))}
          </div>
        </div>

        <div className="section-block">
          <div>
            <h2>Sync folder</h2>
            <p className="folder-path">{syncFolder ?? "No folder selected"}</p>
          </div>

          <div className="button-group">
            <button
              type="button"
              className="secondary-button"
              onClick={chooseSyncFolder}
              disabled={syncing}
            >
              Choose folder
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={openLastSyncedFolder}
              disabled={!lastSyncedFolder || syncing || openingFolder}
            >
              {openingFolder ? "Opening..." : "Open folder"}
            </button>
          </div>
        </div>

        <div className="projects-panel">
          <div className="projects-header">
            <div>
              <h2>Projects</h2>
              <p>{selectedSummary}</p>
              <p className="refresh-meta">
                {formatRefreshTime(lastRefreshedAt)}
              </p>
            </div>

            <div className="button-group">
              <button
                type="button"
                className="secondary-button"
                disabled={syncing || projectsLoading}
                onClick={refreshProjects}
              >
                {projectsLoading ? "Refreshing..." : "Refresh"}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={
                  syncing ||
                  projectsLoading ||
                  checkingLocalRemovals ||
                  !syncFolder ||
                  !hasSelectedProjects ||
                  projectSource !== "local-api"
                }
                onClick={checkLocalRemovals}
              >
                {checkingLocalRemovals ? "Checking..." : "Check local removals"}
              </button>
              <button
                type="button"
                className="secondary-button"
                disabled={!canSync}
                onClick={() => syncSelectedProjects()}
              >
                {syncing ? "Syncing..." : "Sync selected"}
              </button>
            </div>
          </div>

          {localRemovals.length > 0 && (
            <div className="sync-report local-removals-report">
              <span className="sync-report-dot" />
              <div>
                <p>
                  {localRemovals.length} local removal
                  {localRemovals.length === 1 ? "" : "s"} detected. Applying will
                  remove these items from the Filmwave project only.
                </p>
                <div className="local-removal-list">
                  {localRemovals.slice(0, 5).map((removal) => (
                    <span key={`${removal.projectId}-${removal.id}`}>
                      {removal.type === "folder" ? "Folder" : "File"}: {removal.path}
                    </span>
                  ))}
                  {localRemovals.length > 5 && (
                    <span>+{localRemovals.length - 5} more</span>
                  )}
                </div>
                <div className="local-removal-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={applyingLocalRemovals || syncing}
                    onClick={applyLocalRemovals}
                  >
                    {applyingLocalRemovals ? "Applying..." : "Apply to Filmwave"}
                  </button>
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={applyingLocalRemovals || syncing}
                    onClick={() => setLocalRemovals([])}
                  >
                    Ignore
                  </button>
                </div>
              </div>
            </div>
          )}

          {syncProgress && (
            <div className="progress-panel">
              <div className="progress-header">
                <span>{syncProgress.message}</span>
                <span>
                  {syncProgress.completedFiles}/{syncProgress.totalFiles} files
                </span>
              </div>
              <div className="progress-track" aria-hidden="true">
                <div
                  className="progress-fill"
                  style={{ width: `${syncProgressPercent}%` }}
                />
              </div>
            </div>
          )}

          {lastSyncReport && (
            <div className="sync-report">
              <span className="sync-report-dot" />
              <p>{lastSyncReport}</p>
            </div>
          )}

          <div className="project-list">
            {projectsLoading ? (
              <div className="project-row is-loading">
                <span className="project-check" aria-hidden="true" />
                <span className="project-main">
                  <span className="project-name">
                    Loading Filmwave projects
                  </span>
                  <span className="project-description">
                    Fetching your project file trees...
                  </span>
                </span>
              </div>
            ) : projects.length === 0 ? (
              <div className="project-row is-loading">
                <span className="project-check" aria-hidden="true" />
                <span className="project-main">
                  <span className="project-name">No projects found</span>
                  <span className="project-description">
                    Try switching sources or creating a project on Filmwave.
                  </span>
                </span>
              </div>
            ) : (
              projects.map((project) => {
                const selected = selectedProjectIds.includes(project.id);

                return (
                  <button
                    key={project.id}
                    type="button"
                    className={`project-row ${selected ? "is-selected" : ""}`}
                    onClick={() => toggleProject(project.id)}
                  >
                    <span className="project-check" aria-hidden="true">
                      {selected ? "✓" : ""}
                    </span>

                    <span className="project-main">
                      <span className="project-name">{project.name}</span>
                      <span className="project-description">
                        {project.description || "No description"}
                      </span>
                    </span>

                    <span className="project-meta">
                      <span>{project.fileCount} files</span>
                      <span>{project.sizeLabel}</span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
