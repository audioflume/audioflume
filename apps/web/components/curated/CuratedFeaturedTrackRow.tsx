"use client";

import Image from "next/image";
import {
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import WaveformIcon from "@/components/icons/WaveformIcon";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";

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

function CoverImage({ song, index }: { song: Song; index: number }) {
  return (
    <div
      className="relative h-9 w-9 shrink-0 overflow-hidden bg-[var(--bg-tertiary)]"
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
          <WaveformIcon size={20} />
        </div>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
    </div>
  );
}

function PlayButton({ song }: { song: Song }) {
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

function usePlayableCard(song: Song) {
  const { togglePlayPause } = usePlayer();

  function playCard() {
    if (!song.audioUrl) return;

    togglePlayPause(song);
  }

  return {
    role: "button",
    tabIndex: song.audioUrl ? 0 : -1,
    onClick: (event: MouseEvent<HTMLElement>) => {
      stopPlaybackMouseEvent(event);
      playCard();
    },
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      stopPlaybackKeyEvent(event);

      if (!event.repeat) playCard();
    },
    onKeyUp: (event: KeyboardEvent<HTMLElement>) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      stopPlaybackKeyEvent(event);
    },
  };
}

export default function CuratedFeaturedTrackRow({
  song,
  index,
}: {
  song: Song;
  index: number;
}) {
  const cardPlayProps = usePlayableCard(song);

  return (
    <article
      {...cardPlayProps}
      className="group flex h-[54px] cursor-pointer items-center gap-2 bg-[color-mix(in_srgb,var(--bg-primary)_96%,var(--text-primary)_4%)] px-2 transition hover:bg-[color-mix(in_srgb,var(--bg-primary)_94%,var(--text-primary)_6%)] focus:outline-none focus-visible:bg-[color-mix(in_srgb,var(--bg-primary)_94%,var(--text-primary)_6%)]"
      aria-label={`Play ${song.title} by ${song.artist}`}
    >
      <CoverImage song={song} index={index} />

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

      <PlayButton song={song} />
    </article>
  );
}
