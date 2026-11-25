"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import CardMiniPlayer from "@/components/playlists/CardMiniPlayer";
import PlaybackStateIcon from "@/components/icons/PlaybackStateIcon";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";
import styles from "./Discover3.module.css";

type Artist = {
  id: string;
  name: string;
  slug: string;
  designation: string | null;
  hero_image_url: string | null;
  profile_image_url: string | null;
  hero_image_position_x: number;
  hero_image_position_y: number;
  genres?: string[];
  songs: Song[];
};

export default function Discover3ArtistShelves({ featured = false }: { featured?: boolean }) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<string | null>(null);
  const { currentSong, isPlaying, setQueue, togglePlayPause, seekTo } = usePlayer();

  useEffect(() => {
    const close = () => setPreview(null);
    window.addEventListener("audioflume:discover3-preview-open", close);
    return () => window.removeEventListener("audioflume:discover3-preview-open", close);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(featured ? "/api/discover-featured-artists" : "/api/artists/directory", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load artists");
        return response.json();
      })
      .then((data) => {
        if (controller.signal.aborted) return;
        const available: Artist[] = Array.isArray(data?.artists) ? data.artists : [];
        setArtists(available.filter((artist) => artist.hero_image_url || artist.profile_image_url).slice(0, featured ? 8 : 12));
      })
      .catch(() => {})
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [featured]);

  return (
    <section className={featured ? styles.featured : styles.watching} aria-label={featured ? "Founding artists" : "Artists we're watching"}>
      <div className={styles.artistScroller} tabIndex={0} aria-label="Scroll through artists">
        {loading ? Array.from({ length: featured ? 2 : 3 }, (_, index) => <article className={styles.artistCard} key={index} aria-hidden="true" />) :
          artists.map((artist, index) => {
            const playable = (artist.songs || []).filter((song) => Boolean(song.audioUrl));
            const playing = isPlaying && playable.some((song) => song.id === currentSong?.id);
            const genres = Array.from(new Set(artist.genres?.length ? artist.genres : playable.flatMap((song) => song.genres || []))).slice(0, 3);
            const founding = featured || /founding/i.test(artist.designation || "") || artist.name.trim().toLowerCase() === "judah earl";
            return (
              <article className={styles.artistCard} key={artist.id}>
                <img className={styles.artistImage} src={artist.hero_image_url || artist.profile_image_url || ""} alt="" draggable={false} loading={index < 3 ? "eager" : "lazy"} style={{ objectPosition: `${artist.hero_image_position_x ?? 50}% ${artist.hero_image_position_y ?? 50}%` }} />
                <div className={styles.artistShade} />
                {preview === artist.id ? (
                  <CardMiniPlayer wideHero={featured} artistName={artist.name} trackCount={playable.length} songs={playable} currentSongId={currentSong?.id} isPlaying={isPlaying}
                    onPlay={(song) => { setQueue(playable); togglePlayPause(song); }}
                    onSeek={(song, progress) => seekTo(song, progress, Boolean(isPlaying && currentSong?.id === song.id))}
                    onClose={() => setPreview(null)} />
                ) : (
                  <>
                    <Link href={`/artists/${artist.slug}`} className={styles.artistLink} aria-label={`View ${artist.name}`} />
                    {featured && genres.length ? <div className={styles.genres}>{genres.map((genre) => <Link key={genre} href={`/music?genre=${encodeURIComponent(genre)}`}>{genre}</Link>)}</div> : null}
                    {founding ? <img className={styles.mark} src="/founding-artist-mark.svg" alt="Founding Artist" /> : null}
                    <div className={styles.identity}>
                      <span>{artist.name}</span>
                      <span>{artist.designation || "Musician / Composer"}</span>
                    </div>
                    <button className={styles.artistPlay} type="button" disabled={!playable.length} aria-label={`Preview music by ${artist.name}`} onClick={() => { window.dispatchEvent(new Event("audioflume:discover3-preview-open")); setPreview(artist.id); }}>
                      <PlaybackStateIcon playing={playing} size={17} hoverIcon="list" />
                    </button>
                  </>
                )}
              </article>
            );
          })}
      </div>
    </section>
  );
}
