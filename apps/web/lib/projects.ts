import type { Project } from "@/lib/types";

export function normalizeProject(value: unknown): Project {
  const project = value as Partial<Project>;

  return {
    id: Number(project.id),
    clerk_user_id: String(project.clerk_user_id || ""),
    name: String(project.name || "").trim(),
    description:
      typeof project.description === "string" && project.description.trim()
        ? project.description.trim()
        : null,
    position:
      typeof project.position === "number" && Number.isFinite(project.position)
        ? project.position
        : null,
    is_archived: project.is_archived === true,
    created_at: String(project.created_at || ""),
  };
}
