"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ShelfIndicatorNavigation from "@/components/ShelfIndicatorNavigation";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import { CuratedPlaylistCard } from "@/components/curated/CuratedPlaylistShelf";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import styles from "./Discover3.module.css";

export default function Discover3Playlists({ source, showHeading = true, circleArrows = false }: { source?: { playlists: CuratedPlaylist[]; loading: boolean }; showHeading?: boolean; circleArrows?: boolean } = {}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [fetchedPlaylists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [fetchLoading, setLoading] = useState(true);
  const playlists = source?.playlists ?? fetchedPlaylists;
  const loading = source?.loading ?? fetchLoading;
  const hasSource = source !== undefined;
  const [error, setError] = useState(false);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [imageCenterY, setImageCenterY] = useState<number | null>(null);

  useEffect(() => {
    if (hasSource) return;
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
  }, [hasSource]);

  useEffect(() => {
    if (!circleArrows || loading || error) return;
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const image = scroller.querySelector<HTMLElement>("[data-curated-playlist-image]");
    const update = () => {
      setCanScrollPrev(scroller.scrollLeft > 4);
      setCanScrollNext(scroller.scrollLeft < scroller.scrollWidth - scroller.clientWidth - 4);
      setImageCenterY(image ? image.getBoundingClientRect().height / 2 : null);
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    const observer = new ResizeObserver(update);
    observer.observe(scroller);
    if (image) observer.observe(image);
    return () => {
      scroller.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, [circleArrows, loading, error, playlists.length]);

  function moveShelf(direction: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    if (circleArrows) {
      scroller.scrollBy({ left: direction * Math.max(scroller.clientWidth * 0.78, 360), behavior: "smooth" });
      return;
    }
    const first = scroller.children[0];
    const second = scroller.children[1];
    if (!first || !second) return;
    const step = second.getBoundingClientRect().left - first.getBoundingClientRect().left;
    scroller.scrollBy({ left: direction * step, behavior: "smooth" });
  }

  return (
    <section aria-label="Curated playlists">
      {showHeading ? <h2 className={`${styles.playlistHeading} discover3-heading-scope`}>
        <Link className="discover2-watching-heading-link" href="/curated-playlists" aria-label="Explore curated playlists">
          <span className="discover2-watching-heading-default" aria-hidden="true">Curated playlists made for the edit</span>
          <span className="discover2-watching-heading-hover" aria-hidden="true">
            Explore curated playlists
            <svg className="discover2-watching-heading-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
              <path d="M4 21 19 5M4 5h15v15" />
            </svg>
          </span>
        </Link>
      </h2> : null}
      {loading || error ? (
        <div className={styles.songRows}>
          <p className={styles.loading} role="status">{loading ? "Loading playlists…" : "Unable to load curated playlists."}</p>
        </div>
      ) : (
        <div className={`${styles.playlistShelf}${circleArrows ? " group/discover-shelf" : ""}`}>
          {circleArrows && imageCenterY !== null ? (
            <>
              <button
                type="button"
                onClick={() => moveShelf(-1)}
                disabled={!canScrollPrev}
                className="absolute left-8 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/discover-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
                style={{ top: imageCenterY }}
                aria-label="Scroll curated playlists left"
              >
                <ChevronLeftIcon size={18} />
              </button>
              <button
                type="button"
                onClick={() => moveShelf(1)}
                disabled={!canScrollNext}
                className="absolute right-8 z-20 hidden h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-white text-black opacity-0 shadow-[0_12px_34px_rgba(0,0,0,0.25)] transition hover:scale-105 group-hover/discover-shelf:opacity-100 disabled:pointer-events-none disabled:opacity-0 sm:flex"
                style={{ top: imageCenterY }}
                aria-label="Scroll curated playlists right"
              >
                <ChevronRightIcon size={18} />
              </button>
            </>
          ) : null}
          <div className={`${styles.artistScroller} ${styles.playlistScroller}`} ref={scrollerRef} tabIndex={0} aria-label="Scroll through curated playlists">
            {playlists.map((playlist, index) => (
              <CuratedPlaylistCard key={playlist.id} playlist={playlist} index={index} variant="curatedPage" />
            ))}
          </div>
          {!circleArrows && playlists.length > 1 ? (
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
