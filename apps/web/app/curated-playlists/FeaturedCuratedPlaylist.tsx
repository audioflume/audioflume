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

  video.pause();
  video.currentTime = 0;
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

  if (loading || !playlist) {
    return (
      <section className={styles.section}>
        <div className={styles.skeleton} aria-hidden="true" />
      </section>
    );
  }

  const description =
    playlist.description?.trim() || playlist.kicker?.trim() || "Curated for the cut.";

  return (
    <section className={styles.section}>
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
          <div className={styles.frame} aria-hidden="true" />

          <div className={styles.topline}>
            <span>Audioflume Curated</span>
            <span>Featured / 01</span>
          </div>

          <div className={styles.arrow} aria-hidden="true">
            <ArrowUpRightIcon />
          </div>

          <div className={styles.copy}>
            <span className={styles.eyebrow}>Featured Playlist</span>
            <h1>{playlist.name}</h1>
            <p>{description}</p>

            <div className={styles.meta}>
              <span>{formatSongCount(playlist.song_count)}</span>
              <span aria-hidden="true">·</span>
              <span>{playlist.playlist_group}</span>
            </div>

            <span className={styles.cta}>
              Open Playlist
              <span aria-hidden="true">↗</span>
            </span>
          </div>
        </Link>

        <CuratedPlaylistPlayButton
          playlistId={playlist.id}
          playlistName={playlist.name}
          className={styles.playButton}
        />
      </article>
    </section>
  );
}
