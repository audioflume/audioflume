"use client";

import Link from "next/link";
import { useMemo } from "react";

import Footer from "@/components/Footer";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import SongCard from "@/components/SongCard";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import PauseIcon from "@/components/icons/PauseIcon";
import { useHasCurrentSong, useIsCurrentSongPlaying, usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import type { Song } from "@/lib/types";

const HERO_BACKGROUND = "https://images.filmwave.io/images/home/judah-earl-background.png";
const HERO_OVERLAY = "https://images.filmwave.io/images/home/judah-earl-overlay.png";
const LIFETIME_IMAGE = "https://images.filmwave.io/images/home/Lifetime-Access-Home.png";
const ARTISTS_IMAGE = "https://images.filmwave.io/images/home/karsten-winegeart-NYU2vLCqpbQ-unsplash.jpg";

function HomeHeroFeaturedSong({ song }: { song?: Song }) {
  const { togglePlayPause } = usePlayer();
  const playing = useIsCurrentSongPlaying(song?.id ?? "");

  return (
    <button
      className="audioflume-experiment-hero-song"
      type="button"
      disabled={!song?.audioUrl}
      onClick={() => { if (song) togglePlayPause(song); }}
      aria-label={song ? `${playing ? "Pause" : "Play"} ${song.title}` : "Featured song unavailable"}
    >
      <span className="audioflume-experiment-hero-song-copy">
        <strong>{song?.title ?? "Sand Drawing"}</strong>
        <small>{song?.artist ?? "Judah Earl"}</small>
        <span>{song?.genres?.slice(0, 3).join(" · ") ?? "Cinematic · Emotional · Score"}</span>
      </span>
      <span className="audioflume-experiment-hero-song-cover">
        {song?.coverArt ? <img src={song.coverArt} alt="" /> : null}
        {song?.audioUrl && <span className="audioflume-experiment-hero-song-play">
          {playing ? <PauseIcon size={16} /> : <PlayIconSmall size={16} />}
        </span>}
      </span>
    </button>
  );
}

export default function HomeLandingContent({ homeFlashImages: _homeFlashImages }: { homeFlashImages: string[] }) {
  const { songs, loading } = useSongs();
  const playerVisible = useHasCurrentSong();
  const originals = useMemo(() => songs.filter((song) => song.audioUrl && song.artist.trim().toLowerCase() === "audioflume").slice(0, 6), [songs]);
  const newSongs = useMemo(() => songs.filter((song) => Boolean(song.audioUrl)).slice(0, 12), [songs]);
  const featuredSong = songs.find((song) => song.title.toLowerCase() === "sand drawing" && song.artist.toLowerCase() === "judah earl");

  return (
    <main className={`audioflume-home-reference audioflume-home-experiment${playerVisible ? " has-player" : ""}`}>
      <div className="audioflume-experiment-search"><GlobalSearchBar position="flow" layer="high" /></div>

      <div className="audioflume-experiment-main">
        <section className="audioflume-experiment-hero" aria-label="Human made music and SFX for film">
          <img className="audioflume-experiment-hero-background" src={HERO_BACKGROUND} alt="" />
          <div className="audioflume-experiment-hero-shade" aria-hidden="true" />
          <p className="audioflume-experiment-hero-eyebrow">New music and SFX added weekly.</p>
          <h1 className="audioflume-experiment-hero-headline">
            <span>HUMAN</span><span>MADE</span><span>MUSIC</span><span>&amp; SFX</span><span>FOR</span><span>FILM.</span>
          </h1>
          <img className="audioflume-experiment-hero-overlay" src={HERO_OVERLAY} alt="" />
          <Link className="audioflume-experiment-hero-link" href="/music">
            Explore music library <ArrowUpRightIcon size={16} strokeWidth={1.5} />
          </Link>
          <HomeHeroFeaturedSong song={featuredSong} />
        </section>

        <section className="audioflume-experiment-promo-grid" aria-label="Discover Audioflume">
          <div className="audioflume-experiment-lifetime">
            <h2>Lifetime access to original<br />in-house made music.</h2>
            <div className="audioflume-experiment-lifetime-tracks">
              {originals.map((song) => (
                <div className="audioflume-experiment-lifetime-track" key={song.id}>
                  {song.coverArt ? <img src={song.coverArt} alt="" /> : <span />}
                  <div><strong>{song.title}</strong><small>{song.artist}</small></div>
                </div>
              ))}
            </div>
            <div className="audioflume-experiment-lifetime-price">
              <s>$299</s><strong>$99</strong><span>one time payment</span>
            </div>
            <Link className="audioflume-experiment-lifetime-link" href="/pricing" aria-label="Explore lifetime access">
              <ArrowUpRightIcon size={21} strokeWidth={1.5} />
            </Link>
          </div>
          <Link className="audioflume-experiment-artist-promo" href="/artists">
            <img src={ARTISTS_IMAGE} alt="" />
            <div>
              <h2>Discover new artists.</h2>
              <span>Explore the artists behind the sound <ArrowUpRightIcon size={17} strokeWidth={1.5} /></span>
            </div>
          </Link>
        </section>

        <section className="audioflume-experiment-songs" aria-label="Newly added songs">
          <div className="audioflume-experiment-songs-heading">
            <h2>Newly added songs</h2>
            <Link href="/music">Explore new music <ArrowUpRightIcon size={15} strokeWidth={1.5} /></Link>
          </div>
          <div className="audioflume-experiment-songs-list">
            {loading ? (
              <div className="audioflume-experiment-songs-loading" role="status">Loading new music…</div>
            ) : newSongs.map((song) => (
              <SongCard key={song.id} song={song} showDivider={false} />
            ))}
          </div>
        </section>
      </div>
      <Footer showTopBorder={false} />
    </main>
  );
}
