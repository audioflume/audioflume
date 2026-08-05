import Image from "next/image";
import Link from "next/link";

import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

import styles from "./CuratedPlaylistPortals.module.css";

export type CuratedPlaylistPortalGroup = {
  name: string;
  playlists: CuratedPlaylist[];
};

type PortalDefinition = {
  label: string;
  targets: string[];
};

const CATEGORY_PORTALS: PortalDefinition[] = [
  { label: "For Editors", targets: ["Editor Picks"] },
  { label: "By Mood", targets: ["Ambient", "Tension"] },
  { label: "By Genre", targets: ["Commercial", "Documentary"] },
  { label: "For Brands", targets: ["Commercial"] },
  { label: "Travel", targets: ["Travel"] },
  { label: "Documentary", targets: ["Documentary"] },
  { label: "Cinematic", targets: ["Editor Picks", "Documentary"] },
  { label: "Dark & Tense", targets: ["Tension"] },
];

const BOTTOM_PORTALS = [
  {
    eyebrow: "For Editors",
    title: "Built for the Edit",
    description: "Playlists shaped around pacing, movement and the cut.",
    targets: ["Editor Picks", "Commercial", "Documentary"],
  },
  {
    eyebrow: "Browse by Mood",
    title: "Start With a Feeling",
    description: "Move through calm, tension, darkness, lift and everything between.",
    targets: ["Ambient", "Tension", "Travel"],
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

function getPortalPlaylist(
  group: CuratedPlaylistPortalGroup | undefined,
  fallbackPlaylists: CuratedPlaylist[],
  index: number,
) {
  return (
    group?.playlists[0] ||
    fallbackPlaylists[index % Math.max(fallbackPlaylists.length, 1)]
  );
}

function PortalArtwork({
  playlist,
  sizes,
}: {
  playlist?: CuratedPlaylist;
  sizes: string;
}) {
  if (!playlist?.cover_image_url) {
    return <span className={styles.fallback} aria-hidden="true" />;
  }

  return (
    <Image
      src={playlist.cover_image_url}
      alt=""
      fill
      unoptimized
      sizes={sizes}
      className={styles.image}
    />
  );
}

export function CuratedPlaylistCategoryPortals({
  groups,
}: {
  groups: CuratedPlaylistPortalGroup[];
}) {
  if (!groups.length) return null;

  const fallbackPlaylists = groups.flatMap((group) => group.playlists);

  return (
    <section className={styles.categorySection}>
      <div className={styles.sectionHeading}>
        <h2>Explore the Collection</h2>
        <p>Move through the library from the direction that fits the edit.</p>
      </div>

      <div className={styles.categoryGrid}>
        {CATEGORY_PORTALS.map((portal, index) => {
          const group = findGroup(groups, portal.targets);
          const playlist = getPortalPlaylist(group, fallbackPlaylists, index);
          const href = group
            ? `#${getCuratedPlaylistGroupId(group.name)}`
            : "/curated-playlists";

          return (
            <Link
              key={portal.label}
              href={href}
              className={styles.categoryPortal}
            >
              <PortalArtwork
                playlist={playlist}
                sizes="(min-width: 1100px) 300px, (min-width: 700px) 46vw, 240px"
              />
              <span className={styles.overlay} aria-hidden="true" />
              <span className={styles.portalIndex}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.portalLabel}>{portal.label}</span>
              <span className={styles.portalArrow} aria-hidden="true">
                <ArrowUpRightIcon />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function CuratedPlaylistBottomPortals({
  groups,
}: {
  groups: CuratedPlaylistPortalGroup[];
}) {
  if (!groups.length) return null;

  const fallbackPlaylists = groups.flatMap((group) => group.playlists);

  return (
    <section className={styles.bottomSection}>
      <div className={styles.sectionHeading}>
        <h2>Keep Exploring</h2>
      </div>

      <div className={styles.bottomGrid}>
        {BOTTOM_PORTALS.map((portal, index) => {
          const group = findGroup(groups, portal.targets);
          const playlist = getPortalPlaylist(
            group,
            fallbackPlaylists,
            fallbackPlaylists.length - 1 - index,
          );
          const href = group
            ? `#${getCuratedPlaylistGroupId(group.name)}`
            : "/curated-playlists";

          return (
            <Link key={portal.title} href={href} className={styles.bottomPortal}>
              <PortalArtwork
                playlist={playlist}
                sizes="(min-width: 900px) 50vw, 100vw"
              />
              <span className={styles.bottomOverlay} aria-hidden="true" />
              <span className={styles.bottomCopy}>
                <span className={styles.bottomEyebrow}>{portal.eyebrow}</span>
                <strong>{portal.title}</strong>
                <span className={styles.bottomDescription}>
                  {portal.description}
                </span>
              </span>
              <span className={styles.bottomArrow} aria-hidden="true">
                <ArrowUpRightIcon />
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
