export type FilmwaveProject = {
  id: number;
  clerk_user_id: string;
  name: string;
  description: string | null;
  position: number | null;
  created_at: string;
};

export type FilmwaveProjectAssetType =
  | "song"
  | "sound-fx"
  | "visual-fx"
  | "colour-grading";

export type FilmwaveProjectFolder = {
  id: number;
  project_id: number;
  clerk_user_id: string;
  name: string;
  asset_type: FilmwaveProjectAssetType | null;
  parent_folder_id: number | null;
  position: number | null;
  created_at: string;
  updated_at: string;
  asset_count?: number;
  child_count?: number;
};

export type FilmwaveProjectAsset = {
  id: number;
  created_at: string;
  project_id: number;
  asset_type: FilmwaveProjectAssetType | string;
  asset_id: string;
  folder_id: number | null;
  position: number;
  notes: string | null;
  metadata: Record<string, unknown> | null;
};

export type FilmwaveDesktopProjectFileNode = {
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

export type FilmwaveDesktopProject = {
  id: string;
  name: string;
  description: string;
  fileCount: number;
  sizeBytes?: number;
  sizeLabel: string;
  files: FilmwaveDesktopProjectFileNode[];
};

export type FilmwaveDesktopAccount = {
  id: string;
  name: string;
  email: string | null;
  imageUrl: string | null;
};

export type FilmwaveDesktopProjectSyncOperation = {
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

export type FilmwaveDesktopLocalRemoval = {
  projectId: string;
  id: string;
  type: "file" | "folder";
  name?: string;
  path?: string;
};

export type FilmwaveDesktopLocalRemovalResult = {
  removedAssetCount: number;
  removedFolderCount: number;
};

export type FilmwaveDesktopLocalChanges = {
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

export type FilmwaveDesktopLocalChangesResult = {
  createdFolderCount: number;
  movedFolderCount: number;
  createdFileCount: number;
  movedFileCount: number;
  removedAssetCount: number;
  removedFolderCount: number;
  ignoredFileAddCount: number;
};

export type FilmwaveDesktopProjectApiItem = {
  id: string | number;
  name: string;
  description?: string | null;
  fileCount?: number;
  sizeBytes?: number;
  files?: FilmwaveDesktopProjectFileNode[];
};
