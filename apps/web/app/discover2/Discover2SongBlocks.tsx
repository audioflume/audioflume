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
    <section className="discover2-song-section" aria-label="Featured tracks">
      <p className="discover2-song-intro">Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.<br />Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
      {loading ? (
        <HomeTrendingSkeleton discoverLayout />
      ) : (
        <div className="discover2-song-grid">
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
