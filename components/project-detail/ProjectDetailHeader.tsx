import type { ProjectSyncState } from "@/lib/project-detail/projectDetailUtils";
import type { Project } from "@/lib/types";

type ProjectDetailHeaderProps = {
  assetsLoaded: boolean;
  project: Project;
  syncLabel: string;
  syncState: ProjectSyncState;
  totalFileCount: number;
};

export default function ProjectDetailHeader({
  assetsLoaded,
  project,
  syncLabel,
  syncState,
  totalFileCount,
}: ProjectDetailHeaderProps) {
  return (
    <section className="project-detail-hero">
      <div className="project-detail-kicker">Project</div>
      <h1 className="project-detail-title">{project.name}</h1>
      <div className="project-detail-meta">
        <span>Project workspace</span>
        {assetsLoaded && (
          <>
            <span className="project-detail-dot">·</span>
            <span>
              {totalFileCount} {totalFileCount === 1 ? "file" : "files"}
            </span>
          </>
        )}
        <span className="project-detail-dot">·</span>
        <span className={`project-sync-status is-${syncState}`}>
          <span>{syncLabel}</span>
          <span className="project-sync-status-dot" />
        </span>
      </div>
      {project.description && (
        <p className="project-detail-description">{project.description}</p>
      )}
    </section>
  );
}
