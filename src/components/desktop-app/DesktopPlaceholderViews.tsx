import { load } from "@tauri-apps/plugin-store";
import { useEffect, useMemo, useState } from "react";
import {
  completeDesktopProjectSyncOperations,
  getDesktopProjectSyncOperations,
  getFilmwaveProjects,
  normalizeFilmwaveApiBaseUrl,
  type Project,
} from "../../lib/mockFilmwaveApi";
import DesktopProjectsView from "./DesktopProjectsView";

const REALTIME_UPDATED_EVENT = "filmwave:realtime-projects-updated";
const SYNC_OPERATIONS_POLL_MS = 900;
const SETTINGS_STORE = "filmwave-settings.json";

type RealtimeProjectsUpdatedDetail = {
  projectIds?: string[];
  projects?: Project[];
  reason?: "local" | "website";
  updatedAt?: string;
};

type ProjectsHomeViewProps = {
  activeProjectId: string | null;
  apiBaseUrl?: string | null;
  desktopToken?: string | null;
  projects: Project[];
  projectsLoading: boolean;
  selectedProjectIds: string[];
  syncFolder: string | null;
  syncStatus: string;
  onActiveProjectIdChange: (projectId: string | null) => void;
  onOpenSyncSettings: () => void;
};

function mergeProjectUpdates(currentProjects: Project[], updatedProjects: Project[]) {
  if (updatedProjects.length === 0) return currentProjects;

  const updatedProjectMap = new Map(
    updatedProjects.map((project) => [String(project.id), project]),
  );
  const mergedProjects = currentProjects.map((project) =>
    updatedProjectMap.get(String(project.id)) ?? project,
  );
  const existingProjectIds = new Set(currentProjects.map((project) => String(project.id)));
  const newProjects = updatedProjects.filter(
    (project) => !existingProjectIds.has(String(project.id)),
  );

  return [...mergedProjects, ...newProjects];
}

export function ProjectsHomeView({
  activeProjectId,
  apiBaseUrl,
  desktopToken,
  projects,
  projectsLoading,
  syncFolder,
  syncStatus,
  onActiveProjectIdChange,
}: ProjectsHomeViewProps) {
  const [realtimeProjects, setRealtimeProjects] = useState(projects);
  const [activeSyncOperationIds, setActiveSyncOperationIds] = useState<string[]>([]);
  const [savedApiBaseUrl, setSavedApiBaseUrl] = useState<string | null>(apiBaseUrl ?? null);
  const [savedDesktopToken, setSavedDesktopToken] = useState<string | null>(desktopToken ?? null);

  useEffect(() => {
    setRealtimeProjects(projects);
  }, [projects]);

  useEffect(() => {
    setSavedApiBaseUrl(apiBaseUrl ?? null);
  }, [apiBaseUrl]);

  useEffect(() => {
    setSavedDesktopToken(desktopToken ?? null);
  }, [desktopToken]);

  useEffect(() => {
    async function loadSavedConnection() {
      const store = await load(SETTINGS_STORE);
      const nextToken = await store.get<string>("desktopToken");
      const nextApiBaseUrl = await store.get<string>("apiBaseUrl");

      if (nextToken) setSavedDesktopToken(nextToken);
      if (nextApiBaseUrl) setSavedApiBaseUrl(normalizeFilmwaveApiBaseUrl(nextApiBaseUrl));
    }

    void loadSavedConnection();
  }, []);

  useEffect(() => {
    function handleRealtimeProjectsUpdated(event: Event) {
      const detail = (event as CustomEvent<RealtimeProjectsUpdatedDetail>).detail;

      if (!Array.isArray(detail?.projects) || detail.projects.length === 0) return;

      setRealtimeProjects((currentProjects) =>
        mergeProjectUpdates(currentProjects, detail.projects ?? []),
      );
    }

    window.addEventListener(REALTIME_UPDATED_EVENT, handleRealtimeProjectsUpdated);

    return () => {
      window.removeEventListener(REALTIME_UPDATED_EVENT, handleRealtimeProjectsUpdated);
    };
  }, []);

  useEffect(() => {
    const token = savedDesktopToken;
    const apiUrl = savedApiBaseUrl;

    if (!activeProjectId || !token) {
      setActiveSyncOperationIds([]);
      return;
    }

    let cancelled = false;
    let intervalId: number | null = null;
    let handlingOperation = false;

    async function pollSyncOperations() {
      if (handlingOperation) return;

      try {
        const operations = await getDesktopProjectSyncOperations({
          apiBaseUrl: apiUrl,
          projectId: activeProjectId,
          token,
        });
        const operationIds = operations.map((operation) => operation.id);

        if (cancelled) return;

        setActiveSyncOperationIds(operationIds);

        if (operations.length === 0) return;

        handlingOperation = true;

        const latestProjects = await getFilmwaveProjects(token, apiUrl);

        if (cancelled) return;

        setRealtimeProjects(latestProjects);

        await completeDesktopProjectSyncOperations({
          apiBaseUrl: apiUrl,
          projectId: activeProjectId,
          token,
        });

        if (!cancelled) setActiveSyncOperationIds([]);
      } catch (error) {
        console.warn("Could not process desktop sync operations", error);
      } finally {
        handlingOperation = false;
      }
    }

    void pollSyncOperations();
    intervalId = window.setInterval(pollSyncOperations, SYNC_OPERATIONS_POLL_MS);

    return () => {
      cancelled = true;
      if (intervalId) window.clearInterval(intervalId);
    };
  }, [activeProjectId, savedApiBaseUrl, savedDesktopToken]);

  const activeProjectStillExists = useMemo(
    () =>
      !activeProjectId ||
      realtimeProjects.some((project) => String(project.id) === String(activeProjectId)),
    [activeProjectId, realtimeProjects],
  );

  useEffect(() => {
    if (!activeProjectStillExists) {
      onActiveProjectIdChange(null);
    }
  }, [activeProjectStillExists, onActiveProjectIdChange]);

  const activeSyncStatus = activeSyncOperationIds.length > 0 ? "Syncing" : syncStatus;

  return (
    <DesktopProjectsView
      activeProjectId={activeProjectId}
      projects={realtimeProjects}
      projectsLoading={projectsLoading}
      syncFolder={syncFolder}
      syncStatus={activeSyncStatus}
      onActiveProjectIdChange={onActiveProjectIdChange}
    />
  );
}

export function MusicLibraryView() {
  return (
    <section className="desktop-view">
      <div className="desktop-view-header">
        <div>
          <div className="desktop-view-eyebrow">Library</div>
          <h1 className="desktop-view-title">Music</h1>
          <p className="desktop-view-description">
            Search, filter, preview, and send tracks directly into projects.
          </p>
        </div>
      </div>

      <div className="desktop-search-shell">Search by title, artist, mood, genre, key, or BPM</div>
      <div className="desktop-filter-row">
        {[
          "Genre",
          "Mood",
          "Instrument",
          "Vocals",
          "BPM",
          "Key",
          "Edit points",
        ].map((filter) => (
          <span key={filter} className="desktop-filter-pill">
            {filter}
          </span>
        ))}
      </div>

      <div className="desktop-song-list">
        {[
          ["Quiet Motion", "Ambient documentary · 92 BPM · A minor"],
          ["Soft Horizon", "Warm travel bed · 78 BPM · C major"],
          ["Clean Pulse", "Commercial build · 118 BPM · D minor"],
          ["Northline", "Minimal tension · 104 BPM · F minor"],
        ].map(([title, meta]) => (
          <article key={title} className="desktop-song-row">
            <span className="desktop-song-play">▶</span>
            <div>
              <h3 className="desktop-song-title">{title}</h3>
              <p className="desktop-song-meta">{meta}</p>
            </div>
            <div className="desktop-song-tags">
              <span>Add to project</span>
              <span>Sync</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function PlaylistsView() {
  return (
    <section className="desktop-view">
      <div className="desktop-view-header">
        <div>
          <div className="desktop-view-eyebrow">Saved music</div>
          <h1 className="desktop-view-title">Playlists</h1>
          <p className="desktop-view-description">
            User playlists will become syncable collections for active projects.
          </p>
        </div>
      </div>

      <div className="desktop-playlist-grid">
        {[
          ["Documentary shortlist", "12 tracks · ready for project sync"],
          ["Brand film options", "9 tracks · polished commercial cues"],
          ["Travel selects", "15 tracks · world and movement focused"],
          ["Ambient beds", "18 tracks · subtle, low-dialogue cues"],
        ].map(([title, meta]) => (
          <article key={title} className="desktop-playlist-card">
            <div className="desktop-playlist-art" />
            <h3 className="desktop-playlist-title">{title}</h3>
            <p className="desktop-playlist-meta">{meta}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function DiscoverView() {
  return (
    <section className="desktop-view">
      <div className="desktop-view-header">
        <div>
          <div className="desktop-view-eyebrow">Browse</div>
          <h1 className="desktop-view-title">Discover</h1>
          <p className="desktop-view-description">
            Editorial entry points for production styles, quick plays, and compact track picks.
          </p>
        </div>
      </div>

      <div className="desktop-view-grid">
        <article className="desktop-panel">
          <h2 className="desktop-panel-title">Quiet documentary beds</h2>
          <p className="desktop-panel-copy">
            Subtle pulse, emotional restraint, and transparent music choices for narration-led edits.
          </p>
        </article>
        <article className="desktop-panel">
          <h2 className="desktop-panel-title">Fast production shortcuts</h2>
          <p className="desktop-panel-copy">
            This section will surface desktop-friendly quick actions like preview, add to project, and sync locally.
          </p>
        </article>
      </div>
    </section>
  );
}

export function CuratedPlaylistsView() {
  return (
    <section className="desktop-view">
      <div className="desktop-view-header">
        <div>
          <div className="desktop-view-eyebrow">Collections</div>
          <h1 className="desktop-view-title">Curated playlists</h1>
          <p className="desktop-view-description">
            Filmwave editorial playlists organized by use case, production style, and energy.
          </p>
        </div>
      </div>

      <div className="desktop-playlist-grid">
        {[
          ["Documentary", "Grounded cues for human stories"],
          ["Travel", "Movement, place, texture, and rhythm"],
          ["Commercial", "Clean brand-forward music"],
          ["Tension", "Controlled pressure without overpowering edits"],
        ].map(([title, meta]) => (
          <article key={title} className="desktop-playlist-card">
            <div className="desktop-playlist-art" />
            <h3 className="desktop-playlist-title">{title}</h3>
            <p className="desktop-playlist-meta">{meta}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
