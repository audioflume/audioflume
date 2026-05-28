import { TABS } from "../utils/projectDetail";

export default function ProjectPageSkeleton() {
  return (
    <>
      <section className="project-detail-hero">
        <div className="project-detail-skeleton-kicker project-skeleton-block" />
        <div className="project-detail-skeleton-title project-skeleton-block" />
        <div className="project-detail-skeleton-meta">
          <div className="project-detail-skeleton-meta-line project-skeleton-block" />
          <div className="project-detail-skeleton-meta-line short project-skeleton-block" />
        </div>
      </section>
      <div className="project-tabs-row">
        {TABS.map((tab) => (
          <div
            key={tab.value}
            className="project-tab-skeleton project-skeleton-block"
          />
        ))}
      </div>
      <section className="project-tab-panel">
        <div className="project-file-browser">
          <div className="project-file-browser-top">
            <div className="project-detail-skeleton-meta-line short project-skeleton-block" />
            <div className="project-tab-skeleton project-skeleton-block" />
          </div>
          <div className="project-folder-grid">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="project-folder-card skeleton-card">
                <div className="project-folder-icon project-skeleton-block" />
                <div className="project-detail-skeleton-meta-line short project-skeleton-block" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
