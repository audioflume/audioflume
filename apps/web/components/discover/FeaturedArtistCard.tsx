"use client";

import Link from "next/link";

import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";

export type FeaturedArtistCardArtist = {
  id: string;
  name: string;
  slug: string;
  designation?: string | null;
  hero_image_url?: string | null;
  profile_image_url?: string | null;
  hero_image_position_x?: number;
  hero_image_position_y?: number;
  songs: Song[];
};

export default function FeaturedArtistCard({
  artist,
}: {
  artist: FeaturedArtistCardArtist;
}) {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const playableSongs = artist.songs.filter((song) => Boolean(song.audioUrl));
  const artistIsPlaying = Boolean(
    isPlaying &&
      currentSong &&
      playableSongs.some((song) => song.id === currentSong.id),
  );
  const genres = Array.from(
    new Set(
      artist.songs.flatMap((song) =>
        Array.isArray(song.genres) ? song.genres.filter(Boolean) : [],
      ),
    ),
  ).slice(0, 3);
  const image = artist.hero_image_url || artist.profile_image_url || "";

  function playArtist() {
    const firstSong = playableSongs[0];

    if (artistIsPlaying && currentSong) {
      togglePlayPause(currentSong);
      return;
    }

    if (!firstSong) return;
    setQueue(playableSongs);
    togglePlayPause(firstSong);
  }

  return (
    <article className="discover-artist-feature-card">
      <Link
        href={`/artists/${artist.slug}`}
        className="discover-artist-feature-link"
      >
        <div className="discover-artist-feature-media-home">
          {image ? (
            <img
              src={image}
              alt=""
              draggable={false}
              style={{
                objectPosition: `${artist.hero_image_position_x ?? 50}% ${artist.hero_image_position_y ?? 50}%`,
              }}
            />
          ) : null}
        </div>

        <div className="discover-artist-feature-bar">
          <span className="discover-artist-feature-copy">
            <strong>{artist.name}</strong>
            {artist.designation ? (
              <span className="discover-artist-feature-designation">
                {artist.designation}
              </span>
            ) : null}
            <span className="discover-artist-feature-genres">
              {genres.length > 0
                ? genres.map((genre) => <span key={genre}>{genre}</span>)
                : [0, 1, 2].map((placeholder) => (
                    <span
                      key={placeholder}
                      className="is-placeholder"
                      aria-hidden="true"
                    />
                  ))}
            </span>
          </span>
        </div>
      </Link>

      <button
        type="button"
        className="discover-artist-feature-play"
        onClick={playArtist}
        disabled={playableSongs.length === 0}
        aria-label={`${artistIsPlaying ? "Pause" : "Play"} music by ${artist.name}`}
        aria-pressed={artistIsPlaying}
      >
        <span>{artistIsPlaying ? "Pause Music" : "Play Music"}</span>
        {artistIsPlaying ? (
          <PauseIcon size={18} />
        ) : (
          <PlayIconSmall size={18} />
        )}
      </button>
    </article>
  );
}
