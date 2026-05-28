import { supabaseServer } from "@/lib/supabaseServer";

export type ProjectSyncOperationType =
  | "website_project_change"
  | "add_song"
  | "remove_song"
  | "create_folder"
  | "update_folder"
  | "delete_folder"
  | "move_asset"
  | "delete_asset"
  | "desktop_local_changes"
  | "desktop_local_removals"
  | (string & {});

export async function createProjectSyncOperation({
  projectId,
  userId,
  sourceClient,
  operationType,
  websiteDone = sourceClient === "website",
  desktopDone = sourceClient === "desktop",
}: {
  projectId: string | number;
  userId: string;
  sourceClient: "website" | "desktop";
  operationType: ProjectSyncOperationType;
  websiteDone?: boolean;
  desktopDone?: boolean;
}) {
  const { data, error } = await supabaseServer
    .from("project_sync_operations")
    .insert({
      project_id: Number(projectId),
      initiated_by_user_id: userId,
      source_client: sourceClient,
      operation_type: operationType,
      status: "running",
      website_done_at: websiteDone ? new Date().toISOString() : null,
      desktop_done_at: desktopDone ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) {
    console.warn("Could not create project sync operation", error);
    return null;
  }

  return data?.id ? String(data.id) : null;
}

export async function completeProjectSyncOperationsForProject({
  projectId,
  client,
}: {
  projectId: string | number;
  client: "website" | "desktop";
}) {
  const doneColumn = client === "website" ? "website_done_at" : "desktop_done_at";
  const now = new Date().toISOString();

  const { data: operations, error: fetchError } = await supabaseServer
    .from("project_sync_operations")
    .select("id,website_done_at,desktop_done_at")
    .eq("project_id", Number(projectId))
    .eq("status", "running");

  if (fetchError) throw fetchError;

  const runningOperations = operations ?? [];

  await Promise.all(
    runningOperations.map(async (operation) => {
      const websiteDoneAt = client === "website" ? now : operation.website_done_at;
      const desktopDoneAt = client === "desktop" ? now : operation.desktop_done_at;
      const shouldComplete = Boolean(websiteDoneAt && desktopDoneAt);

      const { error } = await supabaseServer
        .from("project_sync_operations")
        .update({
          [doneColumn]: now,
          status: shouldComplete ? "completed" : "running",
          completed_at: shouldComplete ? now : null,
        })
        .eq("id", operation.id);

      if (error) throw error;
    }),
  );
}

export async function failProjectSyncOperation(operationId: string | null, errorMessage: string) {
  if (!operationId) return;

  const { error } = await supabaseServer
    .from("project_sync_operations")
    .update({ status: "failed", error_message: errorMessage })
    .eq("id", operationId);

  if (error) console.warn("Could not mark sync operation failed", error);
}
