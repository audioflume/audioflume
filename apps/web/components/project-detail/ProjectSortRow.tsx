import { SORT_OPTIONS, type ProjectSort } from "@/lib/project-detail/projectDetailUtils";

type ProjectSortRowProps = {
  projectSort: ProjectSort;
  onProjectSortChange: (sort: ProjectSort) => void;
};

export default function ProjectSortRow({
  projectSort,
  onProjectSortChange,
}: ProjectSortRowProps) {
  return (
    <div className="project-sort-row fw-quick-row">
      {SORT_OPTIONS.map((option) => {
        const isActive = projectSort === option.value;

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onProjectSortChange(option.value)}
            className={`fw-filter-chip fw-quick-chip${isActive ? " is-selected" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
