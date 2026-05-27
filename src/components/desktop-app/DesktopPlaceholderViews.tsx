import type { Project } from "../../lib/mockFilmwaveApi";

type ProjectsHomeViewProps = {
  projects: Project[];
  projectsLoading: boolean;
  selectedProjectIds: string[];
  syncFolder: string | null;
  syncStatus: string;
  onOpenSyncSettings: () => void;
};

function getTotalProjectFileCount(projects: Project[]) {
  return projects.reduce((total, project) => total + project.fileCount, 0);
}

function getSelectedProjectLabel(selectedProjectIds: string[]) {
  if (selectedProjectIds.length === 0) return "None selected";
  if (selectedProjectIds.length === 1) return "1 selected";
  return `${selectedProjectIds.length} selected`;
}

export function ProjectsHomeView({
  projects,
  projectsLoading,
  selectedProjectIds,
  syncFolder,
  syncStatus,
  onOpenSyncSettings,
}: ProjectsHomeViewProps) {
  const visibleProjects = projects.slice(0, 6);

  return (
    <section className="desktop-view">
      <div className="desktop-view-header">
        <div>
          <div className="desktop-view-eyebrow">Desktop companion</div>
          <h1 className="desktop-view-title">Projects</h1>
          <p className="desktop-view-description">
            Your local production hub for synced project files, folder structure,
            and timeline-ready music assets.
          </p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={onOpenSyncSettings}
        >
          Desktop sync settings
        </button>
      </div>

      <div className="desktop-view-grid">
        <div className="desktop-panel">
          <div className="desktop-panel-header">
            <div>
              <h2 className="desktop-panel-title">Synced projects</h2>
              <p className="desktop-panel-copy">
                Project files will mirror the website&apos;s All Files structure.
              </p>
            </div>
          </div>

          <div className="desktop-project-list">
            {projectsLoading ? (
              <div className="desktop-project-card">
                <div>
                  <div className="desktop-project-card-title">Loading projects...</div>
                  <div className="desktop-project-card-meta">
                    Fetching your Filmwave project list.
                  </div>
                </div>
                <span className="desktop-project-status">Loading</span>
              </div>
            ) : visibleProjects.length > 0 ? (
              visibleProjects.map((project) => (
                <article key={project.id} className="desktop-project-card">
                  <div>
                    <h3 className="desktop-project-card-title">{project.name}</h3>
                    <p className="desktop-project-card-meta">
                      {project.description || "No project description"} · {project.fileCount} files · {project.sizeLabel}
                    </p>
                  </div>
                  <span className="desktop-project-status">
                    {selectedProjectIds.includes(project.id) ? "Selected" : "Available"}
                  </span>
                </article>
              ))
            ) : (
              <div className="desktop-project-card">
                <div>
                  <div className="desktop-project-card-title">No projects loaded</div>
                  <div className="desktop-project-card-meta">
                    Connect your Filmwave account or switch the source in sync settings.
                  </div>
                </div>
                <span className="desktop-project-status">Idle</span>
              </div>
            )}
          </div>
        </div>

        <aside className="desktop-panel">
          <div className="desktop-panel-header">
            <div>
              <h2 className="desktop-panel-title">Local sync overview</h2>
              <p className="desktop-panel-copy">
                The first production-focused version of the app starts here.
              </p>
            </div>
          </div>

          <div className="desktop-stat-grid">
            <div className="desktop-stat-card">
              <div className="desktop-stat-value">{projects.length}</div>
              <div className="desktop-stat-label">Projects loaded</div>
            </div>
            <div className="desktop-stat-card">
              <div className="desktop-stat-value">{getTotalProjectFileCount(projects)}</div>
              <div className="desktop-stat-label">Project files</div>
            </div>
            <div className="desktop-stat-card">
              <div className="desktop-stat-value">{getSelectedProjectLabel(selectedProjectIds)}</div>
              <div className="desktop-stat-label">Sync selection</div>
            </div>
          </div>

          <div className="desktop-feature-list" style={{ marginTop: 12 }}>
            <div className="desktop-feature-row">
              <h3 className="desktop-panel-title">Status</h3>
              <p>{syncStatus}</p>
            </div>
            <div className="desktop-feature-row">
              <h3 className="desktop-panel-title">Sync folder</h3>
              <p>{syncFolder || "No local folder selected yet."}</p>
            </div>
            <div className="desktop-feature-row">
              <h3 className="desktop-panel-title">Next build target</h3>
              <p>
                Project detail pages with folders, loose files, and local actions.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
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
