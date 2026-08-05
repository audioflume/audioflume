import Image from "next/image";
import Link from "next/link";

import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

import styles from "./CuratedPlaylistPortals.module.css";

export type CuratedPlaylistPortalGroup = {
  name: string;
  playlists: CuratedPlaylist[];
};

type PortalDefinition = {
  label: string;
  description: string;
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

const CATEGORY_PORTALS: PortalDefinition[] = [
  {
    label: "For Editors",
    description: "Cut with purpose",
    icon: "scissors",
    targets: ["Editor Picks"],
  },
  {
    label: "By Mood",
    description: "Find the feeling",
    icon: "waveform",
    targets: ["Ambient", "Tension"],
  },
  {
    label: "By Genre",
    description: "Explore styles",
    icon: "grid",
    targets: ["Commercial", "Documentary"],
  },
  {
    label: "For Brands",
    description: "Sound with intent",
    icon: "tag",
    targets: ["Commercial"],
  },
  {
    label: "Travel",
    description: "Escape. Explore.",
    icon: "globe",
    targets: ["Travel"],
  },
  {
    label: "Documentary",
    description: "Real stories",
    icon: "camera",
    targets: ["Documentary"],
  },
  {
    label: "Cinematic",
    description: "Big screen energy",
    icon: "clapper",
    targets: ["Editor Picks", "Documentary"],
  },
  {
    label: "Dark & Tense",
    description: "Edge and tension",
    icon: "moon",
    targets: ["Tension"],
  },
];

const BOTTOM_PORTALS = [
  {
    title: "For the cut. For the story.",
    description:
      "Curated music for editors, directors, and creatives who need every note to serve the moment.",
    cta: "Learn more",
    badge: "",
    targets: ["Editor Picks", "Commercial"],
  },
  {
    title: "Human Stories",
    description:
      "Intimate, authentic, and quietly powerful. Music for real stories told with heart.",
    cta: "Explore Collection",
    badge: "New Collection",
    targets: ["Documentary"],
  },
];

export function getCuratedPlaylistGroupId(name: string) {
  return `curated-group-${
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "playlists"
  }`;
}

function findGroup(
  groups: CuratedPlaylistPortalGroup[],
  targets: string[],
) {
  for (const target of targets) {
    const normalizedTarget = target.toLowerCase();
    const exactMatch = groups.find(
      (group) => group.name.toLowerCase() === normalizedTarget,
    );

    if (exactMatch) return exactMatch;

    const partialMatch = groups.find((group) =>
      group.name.toLowerCase().includes(normalizedTarget),
    );

    if (partialMatch) return partialMatch;
  }

  return groups[0];
}

function PortalIcon({ icon }: { icon: PortalDefinition["icon"] }) {
  const commonProps = {
    width: 22,
    height: 22,
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

function BottomPortalArtwork({ playlist }: { playlist?: CuratedPlaylist }) {
  if (!playlist?.cover_image_url) {
    return <span className={styles.bottomFallback} aria-hidden="true" />;
  }

  return (
    <Image
      src={playlist.cover_image_url}
      alt=""
      fill
      unoptimized
      sizes="(min-width: 800px) 38vw, 42vw"
      className={styles.bottomImage}
    />
  );
}

export function CuratedPlaylistCategoryPortals({
  groups,
}: {
  groups: CuratedPlaylistPortalGroup[];
}) {
  if (!groups.length) return null;

  return (
    <nav className={styles.categorySection} aria-label="Browse curated playlists">
      <div className={styles.categoryGrid}>
        {CATEGORY_PORTALS.map((portal) => {
          const group = findGroup(groups, portal.targets);
          const href = group
            ? `#${getCuratedPlaylistGroupId(group.name)}`
            : "/curated-playlists";

          return (
            <Link
              key={portal.label}
              href={href}
              className={styles.categoryPortal}
            >
              <span className={styles.icon}>
                <PortalIcon icon={portal.icon} />
              </span>
              <span className={styles.categoryCopy}>
                <strong>{portal.label}</strong>
                <span>{portal.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function CuratedPlaylistBottomPortals({
  groups,
}: {
  groups: CuratedPlaylistPortalGroup[];
}) {
  if (!groups.length) return null;

  return (
    <section className={styles.bottomSection}>
      <div className={styles.bottomGrid}>
        {BOTTOM_PORTALS.map((portal) => {
          const group = findGroup(groups, portal.targets);
          const playlist = group?.playlists[0];
          const href = group
            ? `#${getCuratedPlaylistGroupId(group.name)}`
            : "/curated-playlists";

          return (
            <Link key={portal.title} href={href} className={styles.bottomPortal}>
              <span className={styles.bottomCopy}>
                {portal.badge && (
                  <span className={styles.bottomBadge}>{portal.badge}</span>
                )}
                <strong>{portal.title}</strong>
                <span className={styles.bottomDescription}>
                  {portal.description}
                </span>
                <span className={styles.bottomCta}>
                  {portal.cta}
                  <span aria-hidden="true">→</span>
                </span>
              </span>

              <span className={styles.bottomMedia}>
                <BottomPortalArtwork playlist={playlist} />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
