"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import ShelfIndicatorNavigation from "@/components/ShelfIndicatorNavigation";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";

import styles from "./PlaylistSimilarSounds.module.css";

type SimilarSong = Song & {
  score: number;
};

type RecommendationResponse = {
  recommendations?: SimilarSong[];
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
    const albumMatch = pathname.match(/^\/artists\/[^/]+\/albums\/([^/]+)$/);

    if (curatedMatch?.[1]) {
      params.set("kind", "curated");
      params.set("id", decodeURIComponent(curatedMatch[1]));
    } else if (communityMatch?.[1]) {
      params.set("kind", "community");
      params.set("id", decodeURIComponent(communityMatch[1]));
    } else if (playlistMatch?.[1]) {
      params.set("kind", artistSlug ? "artist" : "playlist");
      params.set("id", decodeURIComponent(playlistMatch[1]));
    } else if (albumMatch?.[1]) {
      params.set("kind", "album");
      params.set("id", decodeURIComponent(albumMatch[1]));
    } else {
      return null;
    }
  }

  return `/api/playlist-recommendations?${params.toString()}`;
}

export default function PlaylistSimilarSounds() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { currentSong, isPlaying, togglePlayPause } = usePlayer();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [recommendations, setRecommendations] = useState<SimilarSong[]>([]);
  const [loading, setLoading] = useState(true);
  const artistSlug = searchParams.get("artist")?.trim() || null;
  const recommendationUrl = useMemo(
    () => buildRecommendationUrl(pathname, artistSlug),
    [artistSlug, pathname],
  );

  function scrollShelf(direction: -1 | 1) {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    scroller.scrollBy({
      left: direction * Math.max(scroller.clientWidth * 0.82, 320),
      behavior: "smooth",
    });
  }

  useEffect(() => {
    const activeRecommendationUrl = recommendationUrl;
    if (!activeRecommendationUrl) {
      setRecommendations([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setRecommendations([]);

    async function loadRecommendations() {
      try {
        const response = await fetch(activeRecommendationUrl!, {
          signal: controller.signal,
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | RecommendationResponse
          | null;

        if (!response.ok) {
          throw new Error(payload?.error || "Unable to load similar songs");
        }

        setRecommendations(
          Array.isArray(payload?.recommendations) ? payload.recommendations : [],
        );
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Failed to load similar songs:", error);
        setRecommendations([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadRecommendations();
    return () => controller.abort();
  }, [recommendationUrl]);

  if (!recommendationUrl || (!loading && recommendations.length === 0)) {
    return null;
  }

  return (
    <section className="playlist-detail-similar" aria-labelledby="playlist-similar-heading">
      <div className="playlist-detail-similar-heading">
        <h2 id="playlist-similar-heading">Similar Sounds</h2>
      </div>

      <div className="group/similar-shelf relative">
        <div
          ref={scrollerRef}
          className={`playlist-detail-similar-scroller ${styles.scroller}`}
        >
          {loading
            ? Array.from({ length: SKELETON_COUNT }, (_, index) => (
                <div key={index} className={styles.card} aria-hidden="true">
                  <div className={styles.art} data-playlist-similar-image>
                    <div className={styles.placeholder} />
                  </div>
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonLineShort} />
                </div>
              ))
            : recommendations.map((song) => {
                const songIsPlaying = currentSong?.id === song.id && isPlaying;

                return (
                  <div key={song.id} className={styles.card}>
                    <article>
                      <div className={styles.art} data-playlist-similar-image>
                        {song.coverArt ? (
                          <img src={song.coverArt} alt="" />
                        ) : (
                          <div className={styles.placeholder} aria-hidden="true" />
                        )}

                        <button
                          type="button"
                          className={styles.playButton}
                          onClick={() => togglePlayPause(song)}
                          aria-label={`${songIsPlaying ? "Pause" : "Play"} ${song.title}`}
                        >
                          {songIsPlaying ? (
                            <PauseIcon size={13} />
                          ) : (
                            <PlayIconSmall size={13} />
                          )}
                        </button>
                      </div>
                      <div className={styles.copy}>
                        <h3>{song.title}</h3>
                        <p>{song.artist}</p>
                      </div>
                    </article>
                  </div>
                );
              })}
        </div>
      </div>
      <ShelfIndicatorNavigation
        label="Similar Sounds"
        scrollerRef={scrollerRef}
        itemCount={loading ? SKELETON_COUNT : recommendations.length}
        onPrev={() => scrollShelf(-1)}
        onNext={() => scrollShelf(1)}
      />
    </section>
  );
}
