"use client";

import { MusicListShell } from "@filmwave/shared";
import { useEffect } from "react";

import "@/app/music/music-library-redesign.css";
import SongCard from "@/components/SongCard";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";

export default function PublicArtistMusic({ songs }: { songs: Song[] }) {
  const { setQueue } = usePlayer();

  useEffect(() => {
    setQueue(songs.filter((song) => song.audioUrl));
  }, [setQueue, songs]);

  return (
    <div style={{ margin: "0 var(--filmwave-page-gutter)" }}>
      <MusicListShell title={null}>
        {songs.map((song) => (
          <SongCard key={song.id} song={song} />
        ))}
      </MusicListShell>
    </div>
  );
}
