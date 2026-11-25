"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ShelfIndicatorNavigation from "@/components/ShelfIndicatorNavigation";
import { CuratedPlaylistCard } from "@/components/curated/CuratedPlaylistShelf";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import styles from "./Discover3.module.css";

export default function Discover3Playlists() {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/curated-playlists", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load curated playlists");
        return response.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const available: CuratedPlaylist[] = Array.isArray(data) ? data.filter((playlist) => !playlist.discover_section) : [];
        setPlaylists(available.sort((a, b) => {
          const aTime = a.created_at ? Date.parse(a.created_at) : 0;
          const bTime = b.created_at ? Date.parse(b.created_at) : 0;
          return aTime !== bTime ? bTime - aTime : b.id - a.id;
        }).slice(0, 9));
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);

  function moveShelf(direction: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const first = scroller.children[0];
    const second = scroller.children[1];
    if (!first || !second) return;
    const step = second.getBoundingClientRect().left - first.getBoundingClientRect().left;
    scroller.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  return (
    <section aria-label="Curated playlists">
      <h2 className={`${styles.playlistHeading} discover3-heading-scope`}>
        <Link className="discover2-watching-heading-link" href="/curated-playlists" aria-label="Explore curated playlists">
          <span className="discover2-watching-heading-default" aria-hidden="true">Curated playlists made for the edit</span>
          <span className="discover2-watching-heading-hover" aria-hidden="true">
            Explore curated playlists
            <svg className="discover2-watching-heading-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
              <path d="M4 21 19 5M4 5h15v15" />
            </svg>
          </span>
        </Link>
      </h2>
      {loading || error ? (
        <div className={styles.songRows}>
          <p className={styles.loading} role="status">{loading ? "Loading playlists…" : "Unable to load curated playlists."}</p>
        </div>
      ) : (
        <div className={styles.playlistShelf}>
          <div className={`${styles.artistScroller} ${styles.playlistScroller}`} ref={scrollerRef} tabIndex={0} aria-label="Scroll through curated playlists">
            {playlists.map((playlist, index) => (
              <CuratedPlaylistCard key={playlist.id} playlist={playlist} index={index} variant="curatedPage" />
            ))}
          </div>
          {playlists.length > 1 ? (
            <div className={styles.shelfNavigation}>
              <ShelfIndicatorNavigation
                label="curated playlists"
                scrollerRef={scrollerRef}
                itemCount={playlists.length}
                onPrev={() => moveShelf(-1)}
                onNext={() => moveShelf(1)}
                progressScrollbar
              />
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
