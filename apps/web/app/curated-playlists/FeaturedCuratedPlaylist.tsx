"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import CuratedPlaylistPlayButton from "@/components/curated/CuratedPlaylistPlayButton";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

import styles from "./FeaturedCuratedPlaylist.module.css";

function playCoverVideo(element: HTMLElement) {
  const video = element.querySelector<HTMLVideoElement>("video");

  if (!video) return;

  video.pause();
  video.currentTime = 0;
  void video.play().catch(() => {});
}

function pauseCoverVideo(element: HTMLElement) {
  element.querySelector<HTMLVideoElement>("video")?.pause();
}

function EditorsPickIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="6.5" cy="6.5" r="5.75" stroke="currentColor" />
      <path
        d="M6.5 3.4V9.6M3.4 6.5H9.6M4.3 4.3L8.7 8.7M8.7 4.3L4.3 8.7"
        stroke="currentColor"
        strokeWidth="0.7"
        strokeLinecap="round"
      />
    </svg>
  );
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

  if (loading || !playlist) {
    return (
      <section className={styles.section}>
        <div className={styles.skeleton} aria-hidden="true" />
      </section>
    );
  }

  const description =
    playlist.description?.trim() ||
    playlist.kicker?.trim() ||
    "Expansive, emotional, and deeply cinematic. Music for journeys into the unknown.";

  return (
    <section className={styles.section}>
      <article
        className={styles.card}
        onMouseEnter={(event) => activateVideo(event.currentTarget)}
        onMouseLeave={(event) => deactivateVideo(event.currentTarget)}
        onFocusCapture={(event) => activateVideo(event.currentTarget)}
        onBlurCapture={(event) => {
          if (
            event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            return;
          }

          deactivateVideo(event.currentTarget);
        }}
      >
        {playlist.cover_image_url && (
          <Image
            src={playlist.cover_image_url}
            alt={playlist.name}
            fill
            unoptimized
            priority
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

        <div className={styles.copy}>
          <div className={styles.badge}>
            <EditorsPickIcon />
            <span>Editor&apos;s Pick</span>
          </div>

          <h1>{playlist.name}</h1>
          <p>{description}</p>

          <div className={styles.actions}>
            <CuratedPlaylistPlayButton
              playlistId={playlist.id}
              playlistName={playlist.name}
              className={styles.playButton}
            />

            <Link
              href={`/curated-playlists/${playlist.id}`}
              className={styles.viewButton}
            >
              View Playlist
            </Link>
          </div>
        </div>

        <div className={styles.indicators} aria-hidden="true">
          <span className={styles.indicatorActive} />
          <span />
          <span />
          <span />
        </div>
      </article>
    </section>
  );
}
