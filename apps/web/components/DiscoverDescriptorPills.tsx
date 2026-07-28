"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import styles from "./DiscoverDescriptorPills.module.css";

type DiscoverCover = {
  id: number;
  cover_image_url?: string | null;
};

const DISCOVER_FEATURE_IMAGE =
  "https://images.filmwave.io/images/discover/140cb058-7569-435a-b76b-da1b744142e6.png";

export default function DiscoverDescriptorPills() {
  const pathname = usePathname();
  const [mountNode, setMountNode] = useState<HTMLDivElement | null>(null);
  const [covers, setCovers] = useState<DiscoverCover[]>([]);

  useEffect(() => {
    if (pathname !== "/discover") {
      setMountNode(null);
      return;
    }

    let frame = 0;
    let node: HTMLDivElement | null = null;

    function mountSection() {
      const content = document.querySelector<HTMLElement>(
        ".discover-page-root .discover-content",
      );

      if (!content) {
        frame = window.requestAnimationFrame(mountSection);
        return;
      }

      node = document.createElement("div");
      node.className = styles.mount;
      content.insertBefore(node, content.firstChild);
      setMountNode(node);
    }

    mountSection();

    return () => {
      window.cancelAnimationFrame(frame);
      node?.remove();
      setMountNode(null);
    };
  }, [pathname]);

  useEffect(() => {
    if (pathname !== "/discover") return;

    let cancelled = false;

    fetch("/api/curated-playlists")
      .then((response) => response.json())
      .then((data) => {
        if (cancelled || !Array.isArray(data)) return;

        setCovers(
          data
            .filter((playlist) => Boolean(playlist?.cover_image_url))
            .slice(0, 3),
        );
      })
      .catch(() => {
        if (!cancelled) setCovers([]);
      });

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  if (!mountNode) return null;

  const coverSlots = Array.from(
    { length: 3 },
    (_, index) => covers[index] ?? null,
  );

  return createPortal(
    <section
      className={styles.feature}
      aria-label="New music and sound effects"
    >
      <div className={styles.visual}>
        <div className={styles.image}>
          <Image
            src={DISCOVER_FEATURE_IMAGE}
            alt=""
            fill
            unoptimized
            sizes="420px"
          />
        </div>

        {coverSlots.map((cover, index) => (
          <div
            key={cover?.id ?? `cover-placeholder-${index}`}
            className={styles.cover}
            aria-hidden="true"
          >
            {cover?.cover_image_url ? (
              <Image
                src={cover.cover_image_url}
                alt=""
                fill
                unoptimized
                sizes="96px"
              />
            ) : (
              <div className={styles.placeholder} />
            )}
          </div>
        ))}
      </div>

      <div className={styles.copy}>
        <h2 className={styles.heading}>
          <span>New music.</span>
          <span>New sounds.</span>
        </h2>
        <p className={styles.body}>
          Fresh additions selected for editors, with more music and sound effects
          arriving regularly.
        </p>
      </div>
    </section>,
    mountNode,
  );
}
