import {
  quickFilterButtonActiveClass,
  quickFilterButtonClass,
} from "@/components/uiClasses";
import { SORT_OPTIONS, type ProjectSort } from "../utils/projectDetail";

type ProjectSortRowProps = {
  projectSort: ProjectSort;
  onProjectSortChange: (sort: ProjectSort) => void;
};

export default function ProjectSortRow({
  projectSort,
  onProjectSortChange,
}: ProjectSortRowProps) {
  return (
    <div className="project-sort-row">
      {SORT_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onProjectSortChange(option.value)}
          className={`${quickFilterButtonClass} ${
            projectSort === option.value ? quickFilterButtonActiveClass : ""
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
