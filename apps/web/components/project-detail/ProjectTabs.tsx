import {
  TABS,
  type ProjectTab,
} from "@/lib/project-detail/projectDetailUtils";

type ProjectTabItem = (typeof TABS)[number];

type Props = {
  activeTab: ProjectTab;
  tabs: readonly ProjectTabItem[];
  onTabChange: (tab: ProjectTab) => void;
};

function TabIcon({ value }: { value: ProjectTab }) {
  if (value === "overview") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7.5C4 6.7 4.7 6 5.5 6h4l1.7 2h7.3c.8 0 1.5.7 1.5 1.5v7c0 .8-.7 1.5-1.5 1.5h-13C4.7 18 4 17.3 4 16.5v-9Z" />
      </svg>
    );
  }

  if (value === "music") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M15 4v10.4a3.2 3.2 0 1 1-1.8-2.9V6.2l6-1.2v8.4a3.2 3.2 0 1 1-1.8-2.9V4.5L15 4Z" />
      </svg>
    );
  }

  if (value === "sound-fx") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 10.2h3.1L11 6.6c.7-.7 1.9-.2 1.9.8v9.2c0 1-1.2 1.5-1.9.8l-3.9-3.6H4v-3.6Zm12.4-2.9c1.1 1 1.8 2.6 1.8 4.7s-.7 3.7-1.8 4.7l-1.3-1.3c.8-.7 1.2-1.9 1.2-3.4s-.4-2.7-1.2-3.4l1.3-1.3Zm2.7-2.4c1.8 1.7 2.9 4 2.9 7.1s-1.1 5.4-2.9 7.1l-1.3-1.3c1.5-1.4 2.3-3.2 2.3-5.8s-.8-4.4-2.3-5.8l1.3-1.3Z" />
      </svg>
    );
  }

  if (value === "visual-fx") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4.5 6.5h15v11h-15v-11Zm2 2v7h11v-7h-11Zm2 1.2 2.6 2.4-2.6 2.4v-4.8Zm4.5 0h2v4.8h-2V9.7Z" />
      </svg>
    );
  }

  if (value === "colour-grading") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 4a8 8 0 1 0 0 16h.7c1 0 1.5-1.2.8-1.9-.5-.5-.2-1.3.5-1.3h1.1A5.9 5.9 0 0 0 21 11c0-3.9-3.8-7-9-7Zm-4 8.2a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm2.7-3.8a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm4.2.2a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Zm1.8 4a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 3.5h7.2L18 7.3v13.2H7V3.5Zm6.6 1.7V8h2.8l-2.8-2.8ZM9 10h7v1.5H9V10Zm0 3h7v1.5H9V13Zm0 3h5v1.5H9V16Z" />
    </svg>
  );
}

export default function ProjectTabs({ activeTab, tabs, onTabChange }: Props) {
  return (
    <nav className="project-tabs-row fw-filter-rail" aria-label="Project sections">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;

        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className={`fw-filter-rail-item${isActive ? " is-active" : ""}`}
            aria-current={isActive}
          >
            <span className="project-tab-icon" aria-hidden="true">
              <TabIcon value={tab.value} />
            </span>
            <span className="fw-filter-rail-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
