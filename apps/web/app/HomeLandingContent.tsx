"use client";

import Link from "next/link";
import { useMemo } from "react";

import Footer from "@/components/Footer";
import HomeSectionWithHeading from "./HomeSectionWithHeading";
import GlobalMusicSearch from "@/components/GlobalMusicSearch";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";
import SongCard from "@/components/SongCard";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import PauseIcon from "@/components/icons/PauseIcon";
import { useHasCurrentSong, useIsCurrentSongPlaying, usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import type { Song } from "@/lib/types";

const HERO_BACKGROUND = "https://images.filmwave.io/images/home/judah-earl-background.png";
const HERO_OVERLAY = "https://images.filmwave.io/images/home/judah-earl-overlay.png";
const ARTISTS_IMAGE = "https://images.filmwave.io/images/home/1746637466005-3b4a2be8450f-gigapixel-low%20resolution%20v2-2x.jpeg";
const CURATED_IMAGE = "https://images.filmwave.io/images/home/jimmy-whitson-LKdN0yuScT8-unsplash.jpg";

function HomeHeroFeaturedSong({ song }: { song?: Song }) {
  const { togglePlayPause } = usePlayer();
  const playing = useIsCurrentSongPlaying(song?.id ?? "");

  return (
    <button
      className={`audioflume-experiment-hero-song${playing ? " is-playing" : ""}`}
      type="button"
      disabled={!song?.audioUrl}
      onClick={() => { if (song) togglePlayPause(song); }}
      aria-label={song ? `${playing ? "Pause" : "Play"} ${song.title}` : "Featured song unavailable"}
    >
      <span className="audioflume-experiment-hero-song-copy">
        <span className="audioflume-experiment-hero-song-identity">
          <strong>{song?.title ?? "Sand Drawing"}</strong>
          <small>{song?.artist ?? "Judah Earl"}</small>
        </span>
        <span className="audioflume-experiment-hero-song-genres">
          {song?.genres?.slice(0, 3).map((genre, index) => <span key={`${genre}-${index}`}>{genre}</span>)}
        </span>
      </span>
      <span className="audioflume-experiment-hero-song-cover">
        {song?.coverArt ? <img src={song.coverArt} alt="" /> : null}
        {song?.audioUrl && <span className="audioflume-experiment-hero-song-play">
          <span className="audioflume-home-featured-song-play" aria-hidden="true">
            {playing ? <PauseIcon size={14} /> : <PlayIconSmall size={14} />}
          </span>
        </span>}
      </span>
    </button>
  );
}

export default function HomeLandingContent({ homeFlashImages: _homeFlashImages }: { homeFlashImages: string[] }) {
  const { songs, loading } = useSongs();
  const playerVisible = useHasCurrentSong();
  const newSongs = useMemo(() => songs.filter((song) => Boolean(song.audioUrl)).slice(0, 12), [songs]);
  const featuredSong = songs.find((song) => song.audioUrl && song.artist.trim().toLowerCase() === "judah earl" && song.title.trim().toLowerCase() === "sand drawing")
    ?? songs.find((song) => song.audioUrl && song.artist.trim().toLowerCase() === "judah earl");

  return (
    <main className={`audioflume-home-reference audioflume-home-experiment${playerVisible ? " has-player" : ""}`}>
      <div className="audioflume-experiment-search">
        <div
          className="audioflume-experiment-search-row"
          onClick={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest(".audioflume-experiment-search-field") &&
              !event.target.closest("button")
            ) {
              event.currentTarget.querySelector<HTMLInputElement>(".audioflume-experiment-search-field input")?.focus();
            }
          }}
        >
          <Link className="audioflume-experiment-search-filter" href="/music?filters=open">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4v16M12 4v16M19 4v16M2 8h6M9 15h6M16 10h6" /></svg>
            <span>Filters</span>
          </Link>
          <GlobalMusicSearch fieldClassName="audioflume-experiment-search-field" clearButtonClassName="audioflume-experiment-search-clear" />
          <GlobalReferenceSearch className="audioflume-experiment-search-similar" />
        </div>
      </div>

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
            Explore music library <ArrowUpRightIcon size={24} strokeWidth={1.5} />
          </Link>
          {featuredSong ? <HomeHeroFeaturedSong song={featuredSong} /> : null}
        </section>

        <section className="audioflume-experiment-promo-grid" aria-label="Discover Audioflume">
          <div className="audioflume-experiment-lifetime">
            <h2>Lifetime access to original<br />in-house made music.</h2>
            <div className="audioflume-experiment-lifetime-footer">
              <Link className="audioflume-experiment-lifetime-price" href="/pricing">
                <s>$299</s>
                <strong>$99</strong>
                <span>one time payment</span>
              </Link>
              <Link className="audioflume-experiment-lifetime-link" href="/pricing" aria-label="Explore lifetime access">
                <ArrowUpRightIcon size={21} strokeWidth={1.5} />
              </Link>
            </div>
          </div>
          <div className="audioflume-experiment-artist-promo">
            <img src={ARTISTS_IMAGE} alt="" />
            <h2>A growing collection of in<br />demand artists and composers.</h2>
            <Link href="/artists">Discover new artists <ArrowUpRightIcon size={24} strokeWidth={1.5} /></Link>
          </div>
        </section>

        <section className="audioflume-experiment-curated" aria-label="Curated playlists">
          <img src={CURATED_IMAGE} alt="" />
          <div className="audioflume-experiment-curated-brand">
            <h2>HUMAN MADE MUSIC.<br />STORY DRIVEN SOUND.</h2>
          </div>
          <p>Curated playlists for editors.</p>
          <Link href="/curated-playlists">
            Explore curated collections <ArrowUpRightIcon size={24} strokeWidth={1.5} />
          </Link>
        </section>

        <section className="audioflume-experiment-songs" aria-label="Newly added songs">
          <HomeSectionWithHeading
            title="Newly added songs"
            linkHref="/music"
            linkLabel="Explore new music"
            contentClassName="audioflume-experiment-songs-list"
          >
            {loading ? (
              <div className="audioflume-experiment-songs-loading" role="status">Loading new music…</div>
            ) : newSongs.map((song) => (
              <SongCard key={song.id} song={song} showDivider={false} />
            ))}
          </HomeSectionWithHeading>
        </section>
      </div>
      <Footer showTopBorder={false} />
    </main>
  );
}
