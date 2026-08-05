"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import CuratedPlaylistPlayButton from "@/components/curated/CuratedPlaylistPlayButton";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

import styles from "./FeaturedCuratedPlaylist.module.css";

function formatSongCount(count?: number) {
  const safeCount = Number(count || 0);
  return `${safeCount} track${safeCount === 1 ? "" : "s"}`;
}

function playCoverVideo(element: HTMLElement) {
  const video = element.querySelector<HTMLVideoElement>("video");

  if (!video) return;

  void video.play().catch(() => {});
}

function pauseCoverVideo(element: HTMLElement) {
  element.querySelector<HTMLVideoElement>("video")?.pause();
}

export default function FeaturedCuratedPlaylist({
  playlist,
  loading = false,
}: {
  playlist?: CuratedPlaylist;
  loading?: boolean;
}) {
  const videoActiveRef = useRef(false);
  const [videoVisible, setVideoVisible] = useState(false);

  if (!loading && !playlist) return null;

  function activateVideo(element: HTMLElement) {
    videoActiveRef.current = true;
    playCoverVideo(element);
  }

  function deactivateVideo(element: HTMLElement) {
    videoActiveRef.current = false;
    setVideoVisible(false);
    pauseCoverVideo(element);
  }

  return (
    <section className={styles.section}>
      <div className="discover-section-heading curated-playlist-shelf-heading">
        <div className="min-w-0">
          <h2>Featured Playlist</h2>
        </div>
      </div>

      {loading || !playlist ? (
        <div className={styles.skeleton} aria-hidden="true" />
      ) : (
        <article className={styles.card}>
          <Link
            href={`/curated-playlists/${playlist.id}`}
            className={styles.link}
            aria-label={`Open ${playlist.name}`}
            onMouseEnter={(event) => activateVideo(event.currentTarget)}
            onMouseLeave={(event) => deactivateVideo(event.currentTarget)}
            onFocus={(event) => activateVideo(event.currentTarget)}
            onBlur={(event) => deactivateVideo(event.currentTarget)}
          >
            {playlist.cover_image_url && (
              <Image
                src={playlist.cover_image_url}
                alt={playlist.name}
                fill
                unoptimized
                sizes="(min-width: 1280px) 1280px, calc(100vw - 56px)"
                className={styles.image}
              />
            )}

            {!playlist.cover_image_url && <div className={styles.fallback} />}

            {playlist.cover_video_url && (
              <video
                src={playlist.cover_video_url}
                className={`${styles.image} ${styles.video} ${
                  videoVisible ? styles.videoVisible : ""
                }`}
                muted
                loop
                playsInline
                preload="none"
                onPlaying={() => {
                  if (videoActiveRef.current) setVideoVisible(true);
                }}
                aria-label={`${playlist.name} cover video`}
              />
            )}

            <div className={styles.overlay} aria-hidden="true" />

            <div className={styles.arrow} aria-hidden="true">
              <ArrowUpRightIcon />
            </div>

            <div className={styles.copy}>
              <h3>{playlist.name}</h3>
              <p>{formatSongCount(playlist.song_count)}</p>
            </div>
          </Link>

          <CuratedPlaylistPlayButton
            playlistId={playlist.id}
            playlistName={playlist.name}
            className={styles.playButton}
          />
        </article>
      )}
    </section>
  );
}
