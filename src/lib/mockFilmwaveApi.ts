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

export type DesktopProjectSyncOperation = {
  id: string;
  project_id: number;
  source_client: "website" | "desktop";
  operation_type: string;
  status: "running" | "completed" | "failed";
  website_done_at: string | null;
  desktop_done_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
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

type DesktopProjectSyncOperationsApiResponse = {
  operations?: DesktopProjectSyncOperation[];
  error?: string;
};

type DesktopLocalRemovalApiResponse = DesktopLocalRemovalResult & {
  error?: string;
};

type DesktopLocalChangesApiResponse = DesktopLocalChangesResult & {
  error?: string;
};

const mockProjects: Project[] = [];

export function normalizeFilmwaveApiBaseUrl(apiBaseUrl?: string | null) {
  const trimmed = typeof apiBaseUrl === "string" ? apiBaseUrl.trim() : "";
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

export async function getDesktopProjectSyncOperations({
  apiBaseUrl,
  projectId,
  token,
}: {
  apiBaseUrl?: string | null;
  projectId: string;
  token?: string | null;
}) {
  if (!token) return [];

  const response = await fetch(
    `${normalizeFilmwaveApiBaseUrl(apiBaseUrl)}/api/desktop/projects/sync-operations?projectId=${encodeURIComponent(projectId)}`,
    {
      credentials: "include",
      headers: getAuthHeaders(token),
    },
  );

  const data = (await response.json()) as DesktopProjectSyncOperationsApiResponse;

  if (!response.ok) {
    throw new Error(data.error || "Failed to load project sync operations");
  }

  return data.operations ?? [];
}

export async function completeDesktopProjectSyncOperations({
  apiBaseUrl,
  projectId,
  token,
}: {
  apiBaseUrl?: string | null;
  projectId: string;
  token?: string | null;
}) {
  if (!token) return;

  const response = await fetch(
    `${normalizeFilmwaveApiBaseUrl(apiBaseUrl)}/api/desktop/projects/sync-operations`,
    {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeaders(token),
      },
      body: JSON.stringify({ projectId }),
    },
  );

  const data = (await response.json()) as { error?: string };

  if (!response.ok) {
    throw new Error(data.error || "Failed to complete project sync operations");
  }
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
