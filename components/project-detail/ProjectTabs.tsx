import {
  filterTriggerActiveClass,
  filterTriggerBaseClass,
  filterTriggerInactiveClass,
} from "@/components/filterUiClasses";
import type { ProjectTab, TABS } from "../utils/projectDetail";

type ProjectTabItem = (typeof TABS)[number];

type ProjectTabsProps = {
  activeTab: ProjectTab;
  tabs: readonly ProjectTabItem[];
  onTabChange: (tab: ProjectTab) => void;
};

export default function ProjectTabs({
  activeTab,
  tabs,
  onTabChange,
}: ProjectTabsProps) {
  return (
    <div className="project-tabs-row">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className={`${filterTriggerBaseClass} ${
              isActive ? filterTriggerActiveClass : filterTriggerInactiveClass
            }`}
          >
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
