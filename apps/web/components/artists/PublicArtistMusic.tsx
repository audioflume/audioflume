"use client";

import { useEffect } from "react";

import SongCard from "@/components/SongCard";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";

export default function PublicArtistMusic({ songs }: { songs: Song[] }) {
  const { setQueue } = usePlayer();

  useEffect(() => {
    setQueue(songs.filter((song) => song.audioUrl));
  }, [setQueue, songs]);

  return (
    <div>
      {songs.map((song) => (
        <SongCard key={song.id} song={song} />
      ))}
    </div>
  );
}
