import type { Project } from "../../lib/mockFilmwaveApi";
import DesktopProjectsView from "./DesktopProjectsView";

type ProjectsHomeViewProps = {
  activeProjectId: string | null;
  projects: Project[];
  projectsLoading: boolean;
  selectedProjectIds: string[];
  syncFolder: string | null;
  syncStatus: string;
  onActiveProjectIdChange: (projectId: string | null) => void;
  onOpenSyncSettings: () => void;
};

export function ProjectsHomeView({
  activeProjectId,
  projects,
  projectsLoading,
  syncFolder,
  syncStatus,
  onActiveProjectIdChange,
}: ProjectsHomeViewProps) {
  return (
    <DesktopProjectsView
      activeProjectId={activeProjectId}
      projects={projects}
      projectsLoading={projectsLoading}
      syncFolder={syncFolder}
      syncStatus={syncStatus}
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
