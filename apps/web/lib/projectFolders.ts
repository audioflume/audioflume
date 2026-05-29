import type { ProjectAsset, ProjectFolder } from "@/lib/types";

const DEFAULT_PROJECT_FOLDERS = [
  { name: "Music", asset_type: "song", position: 0 },
  { name: "Sound FX", asset_type: "sound-fx", position: 1 },
  { name: "Visual FX", asset_type: "visual-fx", position: 2 },
  { name: "Colour Grading", asset_type: "colour-grading", position: 3 },
] as const;

export function normalizeProjectFolder(value: unknown): ProjectFolder {
  const folder = value as Partial<ProjectFolder>;

  return {
    id: Number(folder.id),
    project_id: Number(folder.project_id),
    clerk_user_id: String(folder.clerk_user_id || ""),
    name: String(folder.name || "").trim(),
    asset_type:
      folder.asset_type === "song" ||
      folder.asset_type === "sound-fx" ||
      folder.asset_type === "visual-fx" ||
      folder.asset_type === "colour-grading"
        ? folder.asset_type
        : null,
    parent_folder_id:
      typeof folder.parent_folder_id === "number" &&
      Number.isFinite(folder.parent_folder_id)
        ? folder.parent_folder_id
        : null,
    position:
      typeof folder.position === "number" && Number.isFinite(folder.position)
        ? folder.position
        : null,
    created_at: String(folder.created_at || ""),
    updated_at: String(folder.updated_at || ""),
    asset_count:
      typeof folder.asset_count === "number" && Number.isFinite(folder.asset_count)
        ? folder.asset_count
        : undefined,
    child_count:
      typeof folder.child_count === "number" && Number.isFinite(folder.child_count)
        ? folder.child_count
        : undefined,
  };
}

export function normalizeProjectAsset(value: unknown): ProjectAsset {
  const asset = value as Partial<ProjectAsset>;

  return {
    id: Number(asset.id),
    created_at: String(asset.created_at || ""),
    project_id: Number(asset.project_id),
    asset_type: String(asset.asset_type || ""),
    asset_id: String(asset.asset_id || ""),
    folder_id:
      typeof asset.folder_id === "number" && Number.isFinite(asset.folder_id)
        ? asset.folder_id
        : null,
    position:
      typeof asset.position === "number" && Number.isFinite(asset.position)
        ? asset.position
        : 0,
    notes:
      typeof asset.notes === "string" && asset.notes.trim()
        ? asset.notes.trim()
        : null,
    metadata:
      asset.metadata && typeof asset.metadata === "object" ? asset.metadata : null,
  };
}

export async function ensureDefaultProjectFolders({
  supabase,
  projectId,
  userId,
}: {
  supabase: {
    from: (table: string) => any;
  };
  projectId: number | string;
  userId: string;
}) {
  for (const folder of DEFAULT_PROJECT_FOLDERS) {
    const { data: existing, error: existingError } = await supabase
      .from("project_folders")
      .select("id")
      .eq("project_id", projectId)
      .eq("clerk_user_id", userId)
      .eq("asset_type", folder.asset_type)
      .is("parent_folder_id", null)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existing) continue;

    const { error } = await supabase.from("project_folders").insert({
      project_id: projectId,
      clerk_user_id: userId,
      name: folder.name,
      asset_type: folder.asset_type,
      parent_folder_id: null,
      position: folder.position,
    });

    if (error) {
      throw error;
    }
  }
}

export function getDefaultFolderName(assetType: string) {
  if (assetType === "song") return "Music";
  if (assetType === "sound-fx") return "Sound FX";
  if (assetType === "visual-fx") return "Visual FX";
  if (assetType === "colour-grading") return "Colour Grading";
  return "Folder";
}
