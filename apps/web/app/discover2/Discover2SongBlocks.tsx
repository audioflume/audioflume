"use client";

import { useMemo } from "react";
import { useSongs } from "@/hooks/useSongs";
import { HomeReadyToCutSongCard, HomeTrendingSkeleton } from "../HomePageContent";

export default function Discover2SongBlocks() {
  const { songs, loading } = useSongs();
  const recentSongs = useMemo(
    () => songs.filter((song) => Boolean(song.audioUrl)).slice(0, 12),
    [songs],
  );

  return (
    <section className="audioflume-home-mockup-catalogue">
      {loading ? (
        <HomeTrendingSkeleton discoverLayout />
      ) : (
        <div className="audioflume-home-reference-width grid gap-2 min-[520px]:grid-cols-2 xl:grid-cols-3">
          {recentSongs.map((song, index) => (
            <HomeReadyToCutSongCard
              key={song.id}
              song={song}
              index={index + 30}
              queue={recentSongs}
              discoverPlaybackIcon
            />
          ))}
        </div>
      )}
    </section>
  );
}
