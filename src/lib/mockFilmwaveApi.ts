export const DEFAULT_MOCK_UPDATED_AT = "2026-05-25T00:00:00.000Z";
export const DEFAULT_FILMWAVE_API_BASE_URL = "http://localhost:3000";

export type ProjectFileNode = {
  id: string;
  type: "folder" | "file";
  name: string;
  path: string;
  parentId?: string | null;
  sortOrder?: number;
  downloadUrl?: string;
  sizeBytes?: number;
  sizeLabel?: string;
  updatedAt?: string;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  fileCount: number;
  sizeBytes?: number;
  sizeLabel: string;
  files: ProjectFileNode[];
};

export type DesktopAccount = {
  id: string;
  name: string;
  email: string | null;
  imageUrl: string | null;
};

export type DesktopLocalRemoval = {
  projectId: string;
  id: string;
  type: "file" | "folder";
  name?: string;
  path?: string;
};

export type DesktopLocalRemovalResult = {
  removedAssetCount: number;
  removedFolderCount: number;
};

export type DesktopLocalChanges = {
  folderCreates: Array<{
    projectId: string;
    path: string;
  }>;
  folderMoves: Array<{
    projectId: string;
    id: string;
    path: string;
  }>;
  fileCreates: Array<{
    projectId: string;
    path: string;
    sizeBytes?: number;
  }>;
  fileMoves: Array<{
    projectId: string;
    id: string;
    path: string;
  }>;
  fileRemovals: Array<{
    projectId: string;
    id: string;
  }>;
  folderRemovals: Array<{
    projectId: string;
    id: string;
  }>;
  ignoredFileAddCount: number;
};

export type DesktopLocalChangesResult = {
  createdFolderCount: number;
  movedFolderCount: number;
  createdFileCount: number;
  movedFileCount: number;
  removedAssetCount: number;
  removedFolderCount: number;
  ignoredFileAddCount: number;
};

type DesktopProjectsApiResponse = {
  projects?: Array<{
    id: string | number;
    name: string;
    description?: string | null;
    fileCount?: number;
    sizeBytes?: number;
    files?: ProjectFileNode[];
  }>;
};

type DesktopAccountApiResponse = {
  user?: DesktopAccount;
  error?: string;
};

type DesktopLocalRemovalApiResponse = DesktopLocalRemovalResult & {
  error?: string;
};

type DesktopLocalChangesApiResponse = DesktopLocalChangesResult & {
  error?: string;
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
        updatedAt: "2026-05-25T12:00:00.000Z",
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
        updatedAt: "2026-05-25T12:10:00.000Z",
      },
      {
        id: "doc-file-northline",
        type: "file",
        name: "Northline Pulse.txt",
        path: "Music Selects/Northline Pulse.txt",
        sizeLabel: "71 MB",
        updatedAt: "2026-05-25T12:20:00.000Z",
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
        updatedAt: "2026-05-25T12:30:00.000Z",
      },
      {
        id: "doc-loose-license",
        type: "file",
        name: "License.txt",
        path: "License.txt",
        sizeLabel: "3 KB",
        updatedAt: "2026-05-25T12:40:00.000Z",
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
        updatedAt: "2026-05-25T13:00:00.000Z",
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
        updatedAt: "2026-05-25T13:10:00.000Z",
      },
      {
        id: "brand-file-slow-build",
        type: "file",
        name: "Slow Build.txt",
        path: "Final Music/Slow Build.txt",
        sizeLabel: "88 MB",
        updatedAt: "2026-05-25T13:20:00.000Z",
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
        updatedAt: "2026-05-25T13:30:00.000Z",
      },
      {
        id: "brand-file-bass",
        type: "file",
        name: "Bass.txt",
        path: "Artist Stems/Clean Pulse/Bass.txt",
        sizeLabel: "28 MB",
        updatedAt: "2026-05-25T13:40:00.000Z",
      },
      {
        id: "brand-file-synth",
        type: "file",
        name: "Synth.txt",
        path: "Artist Stems/Clean Pulse/Synth.txt",
        sizeLabel: "41 MB",
        updatedAt: "2026-05-25T13:50:00.000Z",
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
        updatedAt: "2026-05-25T14:00:00.000Z",
      },
      {
        id: "travel-loose-alt",
        type: "file",
        name: "Alternate Cut.txt",
        path: "Alternate Cut.txt",
        sizeLabel: "68 MB",
        updatedAt: "2026-05-25T14:10:00.000Z",
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
        updatedAt: "2026-05-25T14:20:00.000Z",
      },
      {
        id: "travel-loose-license",
        type: "file",
        name: "License.txt",
        path: "License.txt",
        sizeLabel: "3 KB",
        updatedAt: "2026-05-25T14:30:00.000Z",
      },
    ],
  },
];

export function normalizeFilmwaveApiBaseUrl(apiBaseUrl?: string | null) {
  const trimmed = apiBaseUrl?.trim();
  const value = trimmed || DEFAULT_FILMWAVE_API_BASE_URL;

  return value.replace(/\/+$/, "");
}

function formatSize(bytes: number | undefined) {
  if (bytes == null || bytes <= 0) {
    return "Size pending";
  }

  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value >= 10 ? value.toFixed(0) : value.toFixed(1)} ${units[unitIndex]}`;
}

function getAuthHeaders(token?: string | null): HeadersInit {
  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

function normalizeApiProject(project: NonNullable<DesktopProjectsApiResponse["projects"]>[number]): Project {
  const rawSizeBytes = Number(project.sizeBytes || 0);
  const files = Array.isArray(project.files) ? project.files : [];
  const fileCount = Number(project.fileCount || files.filter((file) => file.type === "file").length);
  const sizeBytes = rawSizeBytes > 0 ? rawSizeBytes : undefined;

  return {
    id: String(project.id),
    name: String(project.name || "Untitled Project"),
    description: typeof project.description === "string" ? project.description : "",
    fileCount,
    sizeBytes,
    sizeLabel: fileCount > 0 ? formatSize(sizeBytes) : "0 KB",
    files,
  };
}

export async function getMockProjects() {
  await new Promise((resolve) => window.setTimeout(resolve, 250));

  return mockProjects;
}

export async function getFilmwaveProjects(token?: string | null, apiBaseUrl?: string | null) {
  const response = await fetch(`${normalizeFilmwaveApiBaseUrl(apiBaseUrl)}/api/desktop/projects`, {
    credentials: "include",
    headers: getAuthHeaders(token),
  });

  const data = (await response.json()) as DesktopProjectsApiResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(data.error || "Failed to load Filmwave projects");
  }

  return (data.projects ?? []).map(normalizeApiProject);
}

export async function getDesktopAccount(token?: string | null, apiBaseUrl?: string | null) {
  if (!token) return null;

  const response = await fetch(`${normalizeFilmwaveApiBaseUrl(apiBaseUrl)}/api/desktop/me`, {
    credentials: "include",
    headers: getAuthHeaders(token),
  });

  const data = (await response.json()) as DesktopAccountApiResponse;

  if (!response.ok) {
    throw new Error(data.error || "Failed to load Filmwave account");
  }

  return data.user ?? null;
}

export async function applyDesktopLocalRemovals({
  apiBaseUrl,
  removals,
  token,
}: {
  apiBaseUrl?: string | null;
  removals: DesktopLocalRemoval[];
  token?: string | null;
}) {
  if (!token) {
    throw new Error("Sign in required");
  }

  const response = await fetch(
    `${normalizeFilmwaveApiBaseUrl(apiBaseUrl)}/api/desktop/projects/local-removals`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(token),
      },
      body: JSON.stringify({ removals }),
    },
  );

  const data = (await response.json()) as DesktopLocalRemovalApiResponse;

  if (!response.ok) {
    throw new Error(data.error || "Failed to apply local removals");
  }

  return {
    removedAssetCount: Number(data.removedAssetCount || 0),
    removedFolderCount: Number(data.removedFolderCount || 0),
  } satisfies DesktopLocalRemovalResult;
}

export async function applyDesktopLocalChanges({
  apiBaseUrl,
  changes,
  token,
}: {
  apiBaseUrl?: string | null;
  changes: DesktopLocalChanges;
  token?: string | null;
}) {
  if (!token) {
    throw new Error("Sign in required");
  }

  const response = await fetch(
    `${normalizeFilmwaveApiBaseUrl(apiBaseUrl)}/api/desktop/projects/local-changes`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(token),
      },
      body: JSON.stringify(changes),
    },
  );

  const data = (await response.json()) as DesktopLocalChangesApiResponse;

  if (!response.ok) {
    throw new Error(data.error || "Failed to apply local changes");
  }

  return {
    createdFolderCount: Number(data.createdFolderCount || 0),
    movedFolderCount: Number(data.movedFolderCount || 0),
    createdFileCount: Number(data.createdFileCount || 0),
    movedFileCount: Number(data.movedFileCount || 0),
    removedAssetCount: Number(data.removedAssetCount || 0),
    removedFolderCount: Number(data.removedFolderCount || 0),
    ignoredFileAddCount: Number(data.ignoredFileAddCount || 0),
  } satisfies DesktopLocalChangesResult;
}

export function getDesktopAuthTokenUrl(apiBaseUrl?: string | null) {
  return `${normalizeFilmwaveApiBaseUrl(apiBaseUrl)}/api/desktop/auth/token?callback=deeplink`;
}
