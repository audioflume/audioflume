import { useEffect, useMemo, useState } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { exists, mkdir, writeTextFile } from "@tauri-apps/plugin-fs";
import { load } from "@tauri-apps/plugin-store";
import "./App.css";

const SETTINGS_STORE = "filmwave-settings.json";

type ProjectFileNode = {
  id: string;
  type: "folder" | "file";
  name: string;
  path: string;
  sizeLabel?: string;
};

type Project = {
  id: string;
  name: string;
  description: string;
  fileCount: number;
  sizeLabel: string;
  files: ProjectFileNode[];
};

const mockProjects: Project[] = [
  {
    id: "project-documentary",
    name: "Quiet Documentary Beds",
    description: "Soft movement, subtle pulse, and grounded cue options.",
    fileCount: 7,
    sizeLabel: "412 MB",
    files: [
      {
        id: "doc-loose-brief",
        type: "file",
        name: "Creative Brief.txt",
        path: "Creative Brief.txt",
        sizeLabel: "4 KB",
      },
      {
        id: "doc-folder-music",
        type: "folder",
        name: "Music Selects",
        path: "Music Selects",
      },
      {
        id: "doc-file-aurora",
        type: "file",
        name: "Aurora Bed.txt",
        path: "Music Selects/Aurora Bed.txt",
        sizeLabel: "64 MB",
      },
      {
        id: "doc-file-northline",
        type: "file",
        name: "Northline Pulse.txt",
        path: "Music Selects/Northline Pulse.txt",
        sizeLabel: "71 MB",
      },
      {
        id: "doc-folder-notes",
        type: "folder",
        name: "Client Notes",
        path: "Client Notes",
      },
      {
        id: "doc-file-notes",
        type: "file",
        name: "Scene Notes.txt",
        path: "Client Notes/Scene Notes.txt",
        sizeLabel: "8 KB",
      },
      {
        id: "doc-loose-license",
        type: "file",
        name: "License.txt",
        path: "License.txt",
        sizeLabel: "3 KB",
      },
    ],
  },
  {
    id: "project-brand-film",
    name: "Brand Film Selects",
    description: "Polished motion, warm builds, and clean commercial tracks.",
    fileCount: 9,
    sizeLabel: "680 MB",
    files: [
      {
        id: "brand-loose-readme",
        type: "file",
        name: "README.txt",
        path: "README.txt",
        sizeLabel: "2 KB",
      },
      {
        id: "brand-folder-final",
        type: "folder",
        name: "Final Music",
        path: "Final Music",
      },
      {
        id: "brand-file-clean-pulse",
        type: "file",
        name: "Clean Pulse.txt",
        path: "Final Music/Clean Pulse.txt",
        sizeLabel: "93 MB",
      },
      {
        id: "brand-file-slow-build",
        type: "file",
        name: "Slow Build.txt",
        path: "Final Music/Slow Build.txt",
        sizeLabel: "88 MB",
      },
      {
        id: "brand-folder-stems",
        type: "folder",
        name: "Artist Stems",
        path: "Artist Stems",
      },
      {
        id: "brand-folder-clean-stems",
        type: "folder",
        name: "Clean Pulse",
        path: "Artist Stems/Clean Pulse",
      },
      {
        id: "brand-file-drums",
        type: "file",
        name: "Drums.txt",
        path: "Artist Stems/Clean Pulse/Drums.txt",
        sizeLabel: "35 MB",
      },
      {
        id: "brand-file-bass",
        type: "file",
        name: "Bass.txt",
        path: "Artist Stems/Clean Pulse/Bass.txt",
        sizeLabel: "28 MB",
      },
      {
        id: "brand-file-synth",
        type: "file",
        name: "Synth.txt",
        path: "Artist Stems/Clean Pulse/Synth.txt",
        sizeLabel: "41 MB",
      },
    ],
  },
  {
    id: "project-travel-reel",
    name: "Travel Reel Music",
    description: "Open travel cues, organic rhythm, and light transitions.",
    fileCount: 5,
    sizeLabel: "295 MB",
    files: [
      {
        id: "travel-loose-main",
        type: "file",
        name: "Main Track.txt",
        path: "Main Track.txt",
        sizeLabel: "74 MB",
      },
      {
        id: "travel-loose-alt",
        type: "file",
        name: "Alternate Cut.txt",
        path: "Alternate Cut.txt",
        sizeLabel: "68 MB",
      },
      {
        id: "travel-folder-references",
        type: "folder",
        name: "References",
        path: "References",
      },
      {
        id: "travel-file-reference",
        type: "file",
        name: "Music Direction.txt",
        path: "References/Music Direction.txt",
        sizeLabel: "6 KB",
      },
      {
        id: "travel-loose-license",
        type: "file",
        name: "License.txt",
        path: "License.txt",
        sizeLabel: "3 KB",
      },
    ],
  },
];

function sanitizeFolderName(name: string) {
  return name
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeRelativePath(path: string) {
  const cleanedPath = path
    .split("/")
    .map((part) => sanitizeFolderName(part))
    .filter(Boolean)
    .join("/");

  if (
    !cleanedPath ||
    cleanedPath.startsWith("/") ||
    cleanedPath.includes("..")
  ) {
    throw new Error(`Unsafe file path: ${path}`);
  }

  return cleanedPath;
}

function App() {
  const [syncFolder, setSyncFolder] = useState<string | null>(null);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [syncStatus, setSyncStatus] = useState("Not connected");
  const [lastSyncReport, setLastSyncReport] = useState<string | null>(null);

  const hasSelectedProjects = selectedProjectIds.length > 0;
  const canSync = Boolean(syncFolder) && hasSelectedProjects;

  const selectedSummary = useMemo(() => {
    if (!hasSelectedProjects) {
      return "No projects selected";
    }

    const selectedCount = selectedProjectIds.length;
    const label = selectedCount === 1 ? "project" : "projects";

    return `${selectedCount} ${label} selected`;
  }, [hasSelectedProjects, selectedProjectIds.length]);

  useEffect(() => {
    async function loadSavedSettings() {
      const store = await load(SETTINGS_STORE);
      const savedFolder = await store.get<string>("syncFolder");

      if (savedFolder) {
        setSyncFolder(savedFolder);
        setSyncStatus("Folder ready");
      }
    }

    loadSavedSettings();
  }, []);

  async function chooseSyncFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Choose Filmwave sync folder",
    });

    if (typeof selected === "string") {
      const store = await load(SETTINGS_STORE);

      setSyncFolder(selected);
      setSyncStatus("Folder ready");

      await store.set("syncFolder", selected);
      await store.save();
    }
  }

  function toggleProject(projectId: string) {
    setSelectedProjectIds((current) => {
      if (current.includes(projectId)) {
        return current.filter((id) => id !== projectId);
      }

      return [...current, projectId];
    });
  }

  async function syncSelectedProjects() {
    if (!syncFolder) {
      setSyncStatus("Choose a sync folder first");
      return;
    }

    if (selectedProjectIds.length === 0) {
      setSyncStatus("Select a project first");
      return;
    }

    try {
      setSyncStatus("Checking files...");
      setLastSyncReport(null);

      const selectedProjects = mockProjects.filter((project) =>
        selectedProjectIds.includes(project.id),
      );

      let createdFolderCount = 0;
      let createdFileCount = 0;
      let skippedFileCount = 0;
      let manifestFileCount = 0;

      for (const project of selectedProjects) {
        const projectFolderName = sanitizeFolderName(project.name);
        const projectPath = `${syncFolder}/${projectFolderName}`;
        const manifestPath = `${projectPath}/_filmwave`;

        await mkdir(projectPath, { recursive: true });
        await mkdir(manifestPath, { recursive: true });
        createdFolderCount += 2;

        const folderNodes = project.files.filter(
          (node) => node.type === "folder",
        );
        const fileNodes = project.files.filter((node) => node.type === "file");

        for (const folder of folderNodes) {
          const safePath = sanitizeRelativePath(folder.path);

          await mkdir(`${projectPath}/${safePath}`, { recursive: true });
          createdFolderCount += 1;
        }

        for (const file of fileNodes) {
          const safePath = sanitizeRelativePath(file.path);
          const filePath = `${projectPath}/${safePath}`;
          const parentPath = safePath.split("/").slice(0, -1).join("/");

          if (parentPath) {
            await mkdir(`${projectPath}/${parentPath}`, { recursive: true });
          }

          const fileAlreadyExists = await exists(filePath);

          if (fileAlreadyExists) {
            skippedFileCount += 1;
            continue;
          }

          await writeTextFile(
            filePath,
            [
              `Filmwave placeholder file`,
              ``,
              `Project: ${project.name}`,
              `File: ${file.name}`,
              `Path: ${file.path}`,
              `Size: ${file.sizeLabel ?? "Unknown"}`,
              ``,
              `This placeholder represents a future synced file from Filmwave's All Files section.`,
            ].join("\n"),
          );

          createdFileCount += 1;
        }

        await writeTextFile(
          `${manifestPath}/manifest.json`,
          JSON.stringify(
            {
              projectId: project.id,
              projectName: project.name,
              syncedAt: new Date().toISOString(),
              source: "mock-all-files",
              fileTree: project.files,
            },
            null,
            2,
          ),
        );

        manifestFileCount += 1;
      }

      const projectLabel =
        selectedProjects.length === 1 ? "project" : "projects";
      const createdFileLabel = createdFileCount === 1 ? "file" : "files";
      const skippedFileLabel = skippedFileCount === 1 ? "file" : "files";
      const folderLabel = createdFolderCount === 1 ? "folder" : "folders";
      const manifestLabel = manifestFileCount === 1 ? "manifest" : "manifests";

      setSyncStatus("Synced");
      setLastSyncReport(
        `Synced ${selectedProjects.length} ${projectLabel}. Created ${createdFileCount} ${createdFileLabel}, skipped ${skippedFileCount} existing ${skippedFileLabel}, checked ${createdFolderCount} ${folderLabel}, and wrote ${manifestFileCount} ${manifestLabel}.`,
      );
    } catch (error) {
      console.error(error);
      setSyncStatus("Sync failed");
      setLastSyncReport(
        error instanceof Error
          ? error.message
          : "An unknown sync error occurred.",
      );
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

          <div className="status-pill">
            <span className="status-dot" />
            {syncStatus}
          </div>
        </div>

        <div className="section-block">
          <div>
            <h2>Account</h2>
            <p>Connect your Filmwave account to access your projects.</p>
          </div>

          <button type="button" className="primary-button">
            Sign in
          </button>
        </div>

        <div className="section-block">
          <div>
            <h2>Sync folder</h2>
            <p className="folder-path">{syncFolder ?? "No folder selected"}</p>
          </div>

          <button
            type="button"
            className="secondary-button"
            onClick={chooseSyncFolder}
          >
            Choose folder
          </button>
        </div>

        <div className="projects-panel">
          <div className="projects-header">
            <div>
              <h2>Projects</h2>
              <p>{selectedSummary}</p>
            </div>

            <button
              type="button"
              className="secondary-button"
              disabled={!canSync}
              onClick={syncSelectedProjects}
            >
              Sync selected
            </button>
          </div>

          {lastSyncReport && (
            <div className="sync-report">
              <span className="sync-report-dot" />
              <p>{lastSyncReport}</p>
            </div>
          )}

          <div className="project-list">
            {mockProjects.map((project) => {
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
                      {project.description}
                    </span>
                  </span>

                  <span className="project-meta">
                    <span>{project.fileCount} files</span>
                    <span>{project.sizeLabel}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}

export default App;
