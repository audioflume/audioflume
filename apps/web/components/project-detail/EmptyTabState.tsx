import { TABS, type ProjectTab } from "@/lib/project-detail/projectDetailUtils";

export default function EmptyTabState({ activeTab }: { activeTab: ProjectTab }) {
  const tab = TABS.find((item) => item.value === activeTab);

  if (activeTab === "licenses") {
    return (
      <div className="project-file-empty-inline">
        No licenses in this project yet.
      </div>
    );
  }

  return (
    <div className="project-empty">
      <h2>{tab?.label || "Project"} coming soon</h2>
      <p>
        This section will hold the {tab?.label.toLowerCase() || "project"} media
        connected to this project.
      </p>
    </div>
  );
}
