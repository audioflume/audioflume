import Link from "next/link";

export type CuratedFeatureFilterGroup = {
  name: string;
};

type FilterDefinition = {
  label: string;
  icon:
    | "scissors"
    | "waveform"
    | "grid"
    | "tag"
    | "globe"
    | "camera"
    | "clapper"
    | "moon";
  targets: string[];
};

const FILTERS: FilterDefinition[] = [
  { label: "For Editors", icon: "scissors", targets: ["Editor Picks"] },
  { label: "By Mood", icon: "waveform", targets: ["Ambient", "Tension"] },
  { label: "By Genre", icon: "grid", targets: ["Commercial", "Documentary"] },
  { label: "For Brands", icon: "tag", targets: ["Commercial"] },
  { label: "Travel", icon: "globe", targets: ["Travel"] },
  { label: "Documentary", icon: "camera", targets: ["Documentary"] },
  { label: "Cinematic", icon: "clapper", targets: ["Editor Picks", "Documentary"] },
  { label: "Dark & Moody", icon: "moon", targets: ["Tension"] },
];

export function getCuratedGroupId(name: string) {
  return `curated-group-${
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "playlists"
  }`;
}

function findGroup(groups: CuratedFeatureFilterGroup[], targets: string[]) {
  for (const target of targets) {
    const normalizedTarget = target.toLowerCase();
    const exact = groups.find(
      (group) => group.name.toLowerCase() === normalizedTarget,
    );
    if (exact) return exact;

    const partial = groups.find((group) =>
      group.name.toLowerCase().includes(normalizedTarget),
    );
    if (partial) return partial;
  }

  return undefined;
}

function FilterIcon({ icon }: { icon: FilterDefinition["icon"] }) {
  const commonProps = {
    width: 13,
    height: 13,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.45,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (icon === "scissors") {
    return (
      <svg {...commonProps}>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="6" cy="18" r="2.5" />
        <path d="M8.2 7.2 19 17.5M8.2 16.8 19 6.5M14.5 12l4.5 5.5" />
      </svg>
    );
  }

  if (icon === "waveform") {
    return (
      <svg {...commonProps}>
        <path d="M4 10v4M8 7v10M12 4v16M16 7v10M20 10v4" />
      </svg>
    );
  }

  if (icon === "grid") {
    return (
      <svg {...commonProps}>
        <path d="M4 4h4v4H4zM10 4h4v4h-4zM16 4h4v4h-4zM4 10h4v4H4zM10 10h4v4h-4zM16 10h4v4h-4zM4 16h4v4H4zM10 16h4v4h-4zM16 16h4v4h-4z" />
      </svg>
    );
  }

  if (icon === "tag") {
    return (
      <svg {...commonProps}>
        <path d="M4 5.5V11l8.5 8.5L20 12l-8.5-8.5H6z" />
        <circle cx="8" cy="7.5" r="1" />
      </svg>
    );
  }

  if (icon === "globe") {
    return (
      <svg {...commonProps}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.5 12h17M12 3.5c2.2 2.4 3.3 5.2 3.3 8.5S14.2 18.1 12 20.5M12 3.5C9.8 5.9 8.7 8.7 8.7 12s1.1 6.1 3.3 8.5" />
      </svg>
    );
  }

  if (icon === "camera") {
    return (
      <svg {...commonProps}>
        <path d="M4 7.5h4l1.4-2h5.2l1.4 2h4v11H4z" />
        <circle cx="12" cy="13" r="3.2" />
      </svg>
    );
  }

  if (icon === "clapper") {
    return (
      <svg {...commonProps}>
        <path d="M4 9h16v10H4zM4 9l2-4h16l-2 4M8 5 6 9M13 5l-2 4M18 5l-2 4" />
      </svg>
    );
  }

  return (
    <svg {...commonProps}>
      <path d="M18.5 15.5A8 8 0 0 1 8.5 5.5 8 8 0 1 0 18.5 15.5Z" />
    </svg>
  );
}

export default function CuratedFeatureFilters({
  groups,
}: {
  groups: CuratedFeatureFilterGroup[];
}) {
  if (!groups.length) return null;

  return (
    <nav className="curated-feature-filters" aria-label="Browse curated playlists">
      {FILTERS.map((filter) => {
        const group = findGroup(groups, filter.targets);
        const href = group ? `#${getCuratedGroupId(group.name)}` : "/curated-playlists";

        return (
          <Link key={filter.label} href={href} className="curated-feature-filter-pill">
            <FilterIcon icon={filter.icon} />
            <span>{filter.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
