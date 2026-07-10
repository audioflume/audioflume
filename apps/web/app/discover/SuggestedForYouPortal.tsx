"use client";

import Image from "next/image";
import {
  KeyboardEvent,
  MouseEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import WaveformIcon from "@/components/icons/WaveformIcon";
import { usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import type { Song } from "@/lib/types";

const SUGGESTED_SONG_COUNT = 10;
const SUGGESTED_PORTAL_ID = "discover-suggested-for-you-portal";

function getFallbackGradient(index: number) {
  const gradients = [
    "linear-gradient(135deg, #372f4f 0%, #111111 48%, #75649a 100%)",
    "linear-gradient(135deg, #1f3d3a 0%, #111111 52%, #4d8c7b 100%)",
    "linear-gradient(135deg, #4f3529 0%, #111111 50%, #b66c45 100%)",
    "linear-gradient(135deg, #25364f 0%, #111111 52%, #6287c4 100%)",
    "linear-gradient(135deg, #45233d 0%, #111111 52%, #b75d91 100%)",
  ];

  return gradients[index % gradients.length];
}

function stopPlaybackKeyEvent(event: KeyboardEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation();
}

function stopPlaybackMouseEvent(event: MouseEvent<HTMLElement>) {
  event.preventDefault();
  event.stopPropagation();
  event.nativeEvent.stopImmediatePropagation();
}

function SuggestedCoverImage({ song, index }: { song: Song; index: number }) {
  return (
    <div
      className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md bg-[var(--bg-tertiary)]"
      style={{
        background: song.coverArt ? undefined : getFallbackGradient(index),
      }}
    >
      {song.coverArt ? (
        <Image
          src={song.coverArt}
          alt={`${song.title} cover art`}
          fill
          sizes="36px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
          <WaveformIcon size={18} />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent" />
    </div>
  );
}

function SuggestedPlayButton({ song }: { song: Song }) {
  const { currentSong, isPlaying, togglePlayPause } = usePlayer();
  const active = currentSong?.id === song.id;
  const playing = active && isPlaying;

  return (
    <button
      type="button"
      onClick={(event) => {
        stopPlaybackMouseEvent(event);
        togglePlayPause(song);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;

        stopPlaybackKeyEvent(event);

        if (!event.repeat) togglePlayPause(song);
      }}
      onKeyUp={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        stopPlaybackKeyEvent(event);
      }}
      className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white text-black shadow-[0_8px_24px_rgba(0,0,0,0.22)] transition hover:scale-105 disabled:cursor-default disabled:opacity-50"
      disabled={!song.audioUrl}
      aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
    >
      {playing ? <PauseIcon size={15} /> : <PlayIconSmall size={15} />}
    </button>
  );
}

function SuggestedSongCard({ song, index }: { song: Song; index: number }) {
  const { togglePlayPause } = usePlayer();

  function playCard() {
    if (!song.audioUrl) return;
    togglePlayPause(song);
  }

  return (
    <article
      role="button"
      tabIndex={song.audioUrl ? 0 : -1}
      onClick={(event) => {
        stopPlaybackMouseEvent(event);
        playCard();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;

        stopPlaybackKeyEvent(event);

        if (!event.repeat) playCard();
      }}
      onKeyUp={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        stopPlaybackKeyEvent(event);
      }}
      className="group flex h-[54px] cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-2 transition hover:bg-[var(--bg-hover)] focus:outline-none focus-visible:border-[var(--text-muted)]"
      aria-label={`Play ${song.title} by ${song.artist}`}
    >
      <SuggestedCoverImage song={song} index={index} />

      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[13px] font-medium leading-none text-[var(--text-primary)]">
          {song.title}
        </h3>

        <div className="mt-1.5 flex min-w-0 items-center gap-1.5 text-[10px] leading-none text-[var(--text-muted)]">
          <span className="truncate">{song.artist}</span>
          <span>•</span>
          <span>{song.key || "—"}</span>
          <span>•</span>
          <span>{song.bpm ? `${song.bpm} BPM` : "—"}</span>
        </div>
      </div>

      <SuggestedPlayButton song={song} />
    </article>
  );
}

function SuggestedForYouSection({ songs }: { songs: Song[] }) {
  if (songs.length === 0) return null;

  return (
    <section className="mt-10" aria-label="Suggested for you">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-[family-name:var(--font-instrument-sans)] text-2xl font-medium tracking-[-0.05em]">
            Suggested for you
          </h2>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {songs.map((song, index) => (
          <SuggestedSongCard key={song.id} song={song} index={index + 60} />
        ))}
      </div>
    </section>
  );
}

export default function SuggestedForYouPortal() {
  const { songs, loading } = useSongs();
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  const recentSongs = useMemo(
    () => songs.filter((song) => song.audioUrl).slice(0, SUGGESTED_SONG_COUNT),
    [songs],
  );

  useEffect(() => {
    if (loading) return;

    let createdNode: HTMLElement | null = null;
    let timeoutId: number | null = null;

    function mountPortal() {
      const existingNode = document.getElementById(SUGGESTED_PORTAL_ID);

      if (existingNode) {
        setPortalNode(existingNode);
        return true;
      }

      const readyHeading = Array.from(document.querySelectorAll("h2")).find(
        (heading) => heading.textContent?.trim() === "Ready-to-cut tracks",
      );
      const readySection = readyHeading?.closest("section");
      const parent = readySection?.parentElement;

      if (!readySection || !parent) return false;

      createdNode = document.createElement("div");
      createdNode.id = SUGGESTED_PORTAL_ID;
      parent.insertBefore(createdNode, readySection);
      setPortalNode(createdNode);
      return true;
    }

    if (mountPortal()) {
      return () => {
        createdNode?.remove();
        setPortalNode(null);
      };
    }

    const observer = new MutationObserver(() => {
      if (mountPortal()) observer.disconnect();
    });

    observer.observe(document.body, { childList: true, subtree: true });
    timeoutId = window.setTimeout(() => observer.disconnect(), 10000);

    return () => {
      observer.disconnect();
      if (timeoutId) window.clearTimeout(timeoutId);
      createdNode?.remove();
      setPortalNode(null);
    };
  }, [loading]);

  if (!portalNode || recentSongs.length === 0) return null;

  return createPortal(<SuggestedForYouSection songs={recentSongs} />, portalNode);
}
