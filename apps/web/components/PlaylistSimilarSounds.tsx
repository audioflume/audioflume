"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import ShelfNavigationControls from "@/components/ShelfNavigationControls";

import styles from "./PlaylistSimilarSounds.module.css";

type SimilarPlaylist = {
  id: number;
  name: string;
  cover_image_url: string | null;
  song_count: number;
  score: number;
};

type RecommendationResponse = {
  recommendations?: SimilarPlaylist[];
  error?: string;
};

const SKELETON_COUNT = 5;

function buildRecommendationUrl(
  pathname: string,
  artistSlug: string | null,
) {
  const params = new URLSearchParams();

  if (pathname === "/favorites") {
    params.set("kind", "favorites");
  } else {
    const curatedMatch = pathname.match(/^\/curated-playlists\/([^/]+)$/);
    const communityMatch = pathname.match(/^\/community-playlists\/([^/]+)$/);
    const playlistMatch = pathname.match(/^\/playlists\/([^/]+)$/);

    if (curatedMatch?.[1]) {
      params.set("kind", "curated");
      params.set("id", decodeURIComponent(curatedMatch[1]));
    } else if (communityMatch?.[1]) {
      params.set("kind", "community");
      params.set("id", decodeURIComponent(communityMatch[1]));
    } else if (playlistMatch?.[1]) {
      params.set("kind", artistSlug ? "artist" : "playlist");
      params.set("id", decodeURIComponent(playlistMatch[1]));
    } else {
      return null;
    }
  }

  return `/api/playlist-recommendations?${params.toString()}`;
}

function formatSongCount(count: number) {
  return `${count} song${count === 1 ? "" : "s"}`;
}

export default function PlaylistSimilarSounds() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [recommendations, setRecommendations] = useState<SimilarPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const artistSlug = searchParams.get("artist")?.trim() || null;
  const recommendationUrl = useMemo(
    () => buildRecommendationUrl(pathname, artistSlug),
    [artistSlug, pathname],
  );

  function updateScrollState() {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    setCanScrollPrev(scroller.scrollLeft > 4);
    setCanScrollNext(scroller.scrollLeft < maxScrollLeft - 4);
  }

  function scrollShelf(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * Math.max(scroller.clientWidth * 0.82, 320),
      behavior: "smooth",
    });
  }

  useEffect(() => {
    if (!recommendationUrl) {
      setRecommendations([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setRecommendations([]);

    async function loadRecommendations() {
      try {
        const response = await fetch(recommendationUrl, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | RecommendationResponse
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load similar playlists");
        }

        setRecommendations(
          Array.isArray(payload?.recommendations) ? payload.recommendations : [],
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load similar playlists:", error);
        setRecommendations([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadRecommendations();
    return () => controller.abort();
  }, [recommendationUrl]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    const frame = window.requestAnimationFrame(updateScrollState);
    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(scroller);

    return () => {
      window.cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [loading, recommendations.length]);

  if (!recommendationUrl || (!loading && recommendations.length === 0)) {
    return null;
  }

  return (
    <section className="playlist-detail-similar" aria-labelledby="playlist-similar-heading">
      <div className="playlist-detail-similar-heading">
        <h2 id="playlist-similar-heading">Similar Sounds</h2>
        <ShelfNavigationControls
          label="Similar Sounds"
          onPrev={() => scrollShelf(-1)}
          onNext={() => scrollShelf(1)}
          canScrollPrev={canScrollPrev}
          canScrollNext={canScrollNext}
        />
      </div>

      <div
        ref={scrollerRef}
        className={`playlist-detail-similar-scroller ${styles.scroller}`}
      >
        {loading
          ? Array.from({ length: SKELETON_COUNT }, (_, index) => (
              <div key={index} className={styles.card} aria-hidden="true">
                <div className={styles.art}>
                  <div className={styles.placeholder} />
                </div>
                <div className={styles.skeletonLine} />
                <div className={styles.skeletonLineShort} />
              </div>
            ))
          : recommendations.map((playlist) => (
              <Link
                key={playlist.id}
                href={`/curated-playlists/${playlist.id}`}
                className={styles.card}
              >
                <article>
                  <div className={styles.art}>
                    {playlist.cover_image_url ? (
                      <img src={playlist.cover_image_url} alt="" />
                    ) : (
                      <div className={styles.placeholder} aria-hidden="true" />
                    )}
                  </div>
                  <div className={styles.copy}>
                    <h3>{playlist.name}</h3>
                    <p>{formatSongCount(playlist.song_count)}</p>
                  </div>
                </article>
              </Link>
            ))}
      </div>
    </section>
  );
}
