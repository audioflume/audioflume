"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ShelfIndicatorNavigation from "@/components/ShelfIndicatorNavigation";
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
  profile_image_url?: string | null;
  hero_image_position_x: number;
  hero_image_position_y: number;
  genres?: string[];
  songs: Song[];
};

export default function Discover3ArtistShelves({ featured = false, source }: { featured?: boolean; source?: { artists: Artist[]; loading: boolean } }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const cancelScrollRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelScrollRef.current?.(), []);
  const [fetchedArtists, setArtists] = useState<Artist[]>([]);
  const [fetchLoading, setLoading] = useState(true);
  const artists = source?.artists ?? fetchedArtists;
  const loading = source?.loading ?? fetchLoading;
  const hasSource = source !== undefined;
  const [preview, setPreview] = useState<string | null>(null);
  const { currentSong, isPlaying, setQueue, togglePlayPause, seekTo } = usePlayer();

  useEffect(() => {
    const close = () => setPreview(null);
    window.addEventListener("audioflume:discover3-preview-open", close);
    return () => window.removeEventListener("audioflume:discover3-preview-open", close);
  }, []);

  useEffect(() => {
    if (hasSource) return;
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
  }, [featured, hasSource]);

  function moveShelf(direction: number) {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const first = scroller.children[0];
    const second = scroller.children[1];
    if (!first || !second) return;
    const step = second.getBoundingClientRect().left - first.getBoundingClientRect().left;
    if (hasSource) {
      scroller.scrollBy({ left: direction * step, behavior: "smooth" });
      return;
    }

    cancelScrollRef.current?.();
    const start = scroller.scrollLeft;
    const max = Math.max(0, scroller.scrollWidth - scroller.clientWidth);
    const bounds = scroller.getBoundingClientRect();
    const targets = [0, max];
    for (const child of Array.from(scroller.children).slice(1, -1)) {
      const card = child.getBoundingClientRect();
      const marginEnd = parseFloat(getComputedStyle(child).scrollMarginInlineEnd) || 0;
      targets.push(Math.max(0, Math.min(max, start + card.left - bounds.left + (card.width + marginEnd - scroller.clientWidth) / 2)));
    }
    targets.sort((a, b) => a - b);
    const target = direction > 0
      ? targets.find((position) => position > start + 2) ?? max
      : targets.slice().reverse().find((position) => position < start - 2) ?? 0;
    if (Math.abs(target - start) < 1) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      scroller.scrollTo({ left: target, behavior: "instant" });
      return;
    }

    const previousSnap = scroller.style.scrollSnapType;
    const previousBehavior = scroller.style.scrollBehavior;
    scroller.style.scrollSnapType = "none";
    scroller.style.scrollBehavior = "auto";
    let frame = 0;
    const started = performance.now();
    const duration = 520;
    const cancel = () => {
      cancelAnimationFrame(frame);
      scroller.style.scrollSnapType = previousSnap;
      scroller.style.scrollBehavior = previousBehavior;
      scroller.removeEventListener("wheel", cancel);
      scroller.removeEventListener("pointerdown", cancel);
      scroller.removeEventListener("keydown", cancel);
      window.removeEventListener("resize", cancel);
      cancelScrollRef.current = null;
    };
    cancelScrollRef.current = cancel;
    scroller.addEventListener("wheel", cancel, { passive: true });
    scroller.addEventListener("pointerdown", cancel);
    scroller.addEventListener("keydown", cancel);
    window.addEventListener("resize", cancel);
    const animate = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = t * t * (3 - 2 * t);
      scroller.scrollLeft = start + (target - start) * eased;
      if (t < 1) frame = requestAnimationFrame(animate);
      else cancel();
    };
    frame = requestAnimationFrame(animate);
  }

  return (
    <section className={featured ? styles.featured : styles.watching} aria-label={featured ? "Founding artists" : "Artists we're watching"}>
      <div className={styles.artistScroller} ref={scrollerRef} tabIndex={0} aria-label="Scroll through artists">
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
      {!loading && artists.length > 1 ? (
        <div className={styles.shelfNavigation}>
          <ShelfIndicatorNavigation
            label={featured ? "founding artists" : "artists we're watching"}
            scrollerRef={scrollerRef}
            itemCount={artists.length}
            onPrev={() => moveShelf(-1)}
            onNext={() => moveShelf(1)}
            progressScrollbar
            onProgressPointerDown={() => cancelScrollRef.current?.()}
          />
        </div>
      ) : null}
    </section>
  );
}
