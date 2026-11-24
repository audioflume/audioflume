"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import PlaybackStateIcon from "@/components/icons/PlaybackStateIcon";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";
import { buildWaveformBars, parseWaveformPeaks } from "@filmwave/shared";
import styles from "./Discover2MixedCarousel.module.css";

type Artist = {
  id: string;
  name: string;
  slug: string;
  designation: string | null;
  hero_image_url: string | null;
  profile_image_url: string | null;
  hero_image_position_x: number;
  hero_image_position_y: number;
};
type Playlist = { id: number; name: string; song_count: number; songs: Song[] };
type Item = { kind: "artist"; data: Artist } | { kind: "playlist"; data: Playlist } | { kind: "song"; data: Song };

export default function Discover2MixedCarousel({ songs }: { songs: Song[] }) {
  const [artists, setArtists] = useState<Artist[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const scroller = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();

  useEffect(() => {
    const controller = new AbortController();
    const get = async (url: string) => {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("Unable to load carousel content");
      return response.json();
    };
    const artistRequest = get("/api/artists/directory").then((data) => {
      if (!controller.signal.aborted && Array.isArray(data?.artists)) {
        const available: Artist[] = data.artists.filter((artist: Artist) => artist.hero_image_url || artist.profile_image_url);
        const judah = available.find((artist) => artist.name.toLowerCase() === "judah earl");
        const others = available.filter((artist) => artist !== judah);
        setArtists(judah ? [...others.slice(0, 1), judah, ...others.slice(1, 5)] : available.slice(0, 6));
      }
    });
    const playlistRequest = get("/api/curated-playlists").then(async (data) => {
      if (!Array.isArray(data)) return;
      const preferred = data.find((playlist) => /emotive.*cinematic/i.test(playlist.name));
      const selected = (preferred ? [preferred, ...data.filter((playlist) => playlist.id !== preferred.id)] : data).slice(0, 3);
      const entries = await Promise.all(selected.map(async (playlist) => {
        try {
          const tracks = await get("/api/curated-playlists/" + encodeURIComponent(String(playlist.id)) + "/songs");
          return { ...playlist, songs: Array.isArray(tracks) ? tracks : [] } as Playlist;
        } catch { return null; }
      }));
      if (!controller.signal.aborted) setPlaylists(entries.filter((entry): entry is Playlist => entry !== null));
    });
    void Promise.allSettled([artistRequest, playlistRequest]).then(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, []);

  const playable = useMemo(() => {
    const available = songs.filter((song) => song.audioUrl && song.coverArt);
    const preferred = available.find((song) => song.title.toLowerCase() === "the final crossing");
    return (preferred ? [preferred, ...available.filter((song) => song.id !== preferred.id)] : available).slice(0, 5);
  }, [songs]);
  const waveformBars = useMemo(() => new Map(playable.map((song) => [
    song.id,
    buildWaveformBars(parseWaveformPeaks(song.waveformPeaks), 160, { minBarHeight: 1, maxBarHeight: 24 }),
  ])), [playable]);
  const items = useMemo(() => {
    const result: Item[] = [];
    if (artists[0]) result.push({ kind: "artist", data: artists[0] });
    for (let index = 0; index < Math.max(artists.length - 1, playlists.length, playable.length); index++) {
      if (playlists[index]) result.push({ kind: "playlist", data: playlists[index] });
      if (artists[index + 1]) result.push({ kind: "artist", data: artists[index + 1] });
      if (playable[index]) result.push({ kind: "song", data: playable[index] });
    }
    return result;
  }, [artists, playlists, playable]);

  const loopEnabled = items.length >= 5;
  const loopItems = useMemo(() => loopEnabled ? [...items, ...items, ...items] : items, [items, loopEnabled]);

  useEffect(() => {
    if (loading || !scroller.current || !items.length) return;
    const element = scroller.current;
    const cycleWidth = () => {
      const first = element.children[0];
      const repeat = element.children[items.length];
      return first && repeat ? repeat.getBoundingClientRect().left - first.getBoundingClientRect().left : 0;
    };
    const centerCard = (index: number) => {
      const card = element.children[index] as HTMLElement | undefined;
      if (!card) return;
      element.scrollLeft += card.getBoundingClientRect().left - element.getBoundingClientRect().left - (element.clientWidth - card.offsetWidth) / 2;
    };

    if (loopEnabled) {
      if (!initialized.current || element.scrollLeft < cycleWidth() / 2) {
        centerCard(items.length + Math.min(2, items.length - 1));
      }
    } else if (!initialized.current) {
      centerCard(Math.min(2, items.length - 1));
    }
    initialized.current = true;

    if (!loopEnabled) return;
    const wrap = () => {
      const width = cycleWidth();
      if (!width || width <= element.clientWidth) return;
      const left = element.scrollLeft;
      const middle = left + element.clientWidth / 2;
      if (middle < width) {
        element.scrollLeft = left + width;
      } else if (middle >= width * 2) {
        element.scrollLeft = left - width;
      }
    };
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const onScrollEnd = () => {
      clearTimeout(settleTimer);
      wrap();
    };
    const onScroll = () => {
      clearTimeout(settleTimer);
      // Preserve native trackpad momentum; normalize only after scrolling settles.
      settleTimer = setTimeout(onScrollEnd, 180);
    };
    if ("onscrollend" in element) {
      element.addEventListener("scrollend", onScrollEnd);
    } else {
      element.addEventListener("scroll", onScroll, { passive: true });
    }
    return () => {
      clearTimeout(settleTimer);
      element.removeEventListener("scrollend", onScrollEnd);
      element.removeEventListener("scroll", onScroll);
    };
  }, [loading, items.length, loopEnabled]);

  if (loading || !items.length) return null;
  return (
    <section className={styles.shelf} aria-label="Discover artists, songs and playlists">
      <div className={styles.scroller} ref={scroller} tabIndex={0} aria-label="Scroll to explore">
        {loopItems.map((item, index) => {
          const arrow = <span className={styles.arrow}><ArrowUpRightIcon size={30} strokeWidth={1.5} /></span>;
          if (item.kind === "artist") {
            const artist = item.data;
            return (
              <article className={styles.item} key={"artist-" + artist.id + "-" + index}>
                <Link className={styles.card} href={"/artists/" + artist.slug}>
                  <img className={styles.artistImage} src={artist.hero_image_url || artist.profile_image_url || ""} alt="" style={{ objectPosition: artist.hero_image_position_x + "% " + artist.hero_image_position_y + "%" }} />
                  <span className={styles.artistShade} />
                  {(artist.name.trim().toLowerCase() === "judah earl" || /founding/i.test(artist.designation || "")) ? <img className={styles.mark} src="/founding-artist-mark.svg" alt="Founding Artist" /> : null}
                  <span className={styles.artistName}><span className={styles.pill}>{artist.name}</span></span>
                  {arrow}
                </Link>
                <div className={styles.caption}><span>Explore</span><span>View Artist Page</span></div>
              </article>
            );
          }
          if (item.kind === "playlist") {
            const playlist = item.data;
            return (
              <article className={styles.item} key={"playlist-" + playlist.id + "-" + index}>
                <Link className={styles.card} href={"/curated-playlists/" + playlist.id}>
                  <span className={styles.playlistTop}>Playlists</span>
                  <div className={styles.playlistBottom}>
                    <div className={styles.circles}>{playlist.songs.filter((song) => song.coverArt).slice(0, 3).map((song, index) => <img key={index} src={song.coverArt || ""} alt="" />)}</div>
                    <span className={styles.playlistLabel}><svg width={18} height={18} viewBox="59.9 2.59 21.97 20.34" fill="currentColor" aria-hidden="true">
                      <path d="M71.49,2.59h1.93v10.17h-1.93V2.59Z"/>
                      <path d="M68.36,12.76h1.93v10.17h-1.93v-10.17Z"/>
                      <path d="M65.22,6.61h1.93v6.15h-1.93v-6.15Z"/>
                      <path d="M74.62,12.77h1.93v6.15h-1.93v-6.15Z"/>
                      <path d="M77.75,9.37h1.93v3.39h-1.93v-3.39Z"/>
                      <path d="M62.09,12.77h1.93v3.39h-1.93v-3.39Z"/>
                    </svg> Discover</span>
                    <div className={styles.playlistTitle}>{playlist.name}</div>
                    <span className={styles.pill}>{playlist.song_count ?? playlist.songs.length} songs</span>
                  </div>
                  {arrow}
                </Link>
                <div className={styles.caption}><span>Discover</span><span>Explore Playlist</span></div>
              </article>
            );
          }
          const song = item.data;
          const playing = currentSong?.id === song.id && isPlaying;
          return (
            <article className={styles.item} key={"song-" + song.id + "-" + index}>
              <div className={styles.card}>
                <img className={styles.songBackdrop} src={song.coverArt || ""} alt="" />
                <img className={styles.songArt} src={song.coverArt || ""} alt="" />
                {(waveformBars.get(song.id)?.length ?? 0) > 0 ? (
                  <svg className={styles.songWaveform} viewBox="0 0 160 24" preserveAspectRatio="none" aria-hidden="true" fill="currentColor">
                    {waveformBars.get(song.id)?.map((height, barIndex) => (
                      <rect key={barIndex} x={barIndex * 2.5} y={(24 - height) / 2} width={1.5} height={height} />
                    ))}
                  </svg>
                ) : null}
                <div className={styles.songInfo}>
                  <button className={styles.play} type="button" aria-label={(playing ? "Pause " : "Play ") + song.title} onClick={() => { setQueue(playable); togglePlayPause(song); }}><PlaybackStateIcon playing={playing} size={17} /></button>
                  <span className={styles.songCopy}><span>{song.title}</span><span>{song.artist}</span></span>
                </div>
              </div>
              <div className={styles.caption}><span>Listen</span><span>{song.title}</span></div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
