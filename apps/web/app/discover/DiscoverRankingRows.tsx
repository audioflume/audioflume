"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import SectionTitle from "@/components/SectionTitle";
import cardStyles from "@/components/curated/CuratedPlaylistCard.module.css";
import "./discover-ranking-rows.css";

const TRENDING_PLAYLISTS = [
  "After Dark",
  "Open Roads",
  "Slow Burn",
  "Golden Hour",
  "Under Pressure",
  "New Ground",
];

const POPULAR_PLAYLISTS = [
  "Built to Move",
  "Quietly Becoming",
  "Night Drive",
  "Wide Open",
  "Soft Focus",
  "Holding Pattern",
];

function DiscoverRankingCard({ name }: { name: string }) {
  return (
    <article className={cardStyles.card}>
      <div className="discover-ranking-card-image" aria-hidden="true" />

      <div className={cardStyles.details}>
        <div className={cardStyles.copy}>
          <h3>{name}</h3>
          <p>0 tracks</p>
        </div>
      </div>
    </article>
  );
}

function DiscoverRankingRow({
  title,
  playlists,
}: {
  title: string;
  playlists: string[];
}) {
  return (
    <section className="discover-section discover-ranking-row">
      <div className="discover-section-header">
        <SectionTitle>{title}</SectionTitle>
      </div>

      <div className="discover-ranking-grid">
        {playlists.map((playlist) => (
          <DiscoverRankingCard key={playlist} name={playlist} />
        ))}
      </div>
    </section>
  );
}

export default function DiscoverRankingRows() {
  const pathname = usePathname();
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (pathname !== "/discover") {
      setMountNode(null);
      return;
    }

    let activeMount: HTMLElement | null = null;

    const syncMount = () => {
      const content = document.querySelector<HTMLElement>(".discover-content");
      const curatedShelf = content?.querySelector<HTMLElement>(
        ".discover-curated-playlist-section",
      );

      if (!content || !curatedShelf) return;

      let mount = content.querySelector<HTMLElement>(
        ":scope > .discover-ranking-rows-mount",
      );

      if (!mount) {
        mount = document.createElement("div");
        mount.className = "discover-ranking-rows-mount";
      }

      if (curatedShelf.nextElementSibling !== mount) {
        curatedShelf.insertAdjacentElement("afterend", mount);
      }

      activeMount = mount;
      setMountNode(mount);
    };

    syncMount();

    const observer = new MutationObserver(syncMount);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      activeMount?.remove();
      setMountNode(null);
    };
  }, [pathname]);

  if (pathname !== "/discover" || !mountNode) return null;

  return createPortal(
    <>
      <DiscoverRankingRow title="Trending" playlists={TRENDING_PLAYLISTS} />
      <DiscoverRankingRow title="Popular" playlists={POPULAR_PLAYLISTS} />
    </>,
    mountNode,
  );
}
