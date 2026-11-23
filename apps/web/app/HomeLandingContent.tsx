"use client";

import Link from "next/link";
import { useMemo } from "react";

import Footer from "@/components/Footer";
import { AudioflumeMark } from "@/components/LifetimeAccessCard";
import HomeSectionWithHeading from "./HomeSectionWithHeading";
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
const COLLAGE_IMAGE = "https://images.filmwave.io/images/home/kriss-films-I8OoRxdxCqk-unsplash.jpg";

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

export function HomeHeroBanner({ backgroundOnly = false }: { featuredSong?: Song; backgroundOnly?: boolean }) {
  return (
    <section className="audioflume-experiment-hero" aria-label="Human made music and SFX for film">
      <img className="audioflume-experiment-hero-background" src={HERO_BACKGROUND} alt="" />
      <p className="audioflume-experiment-hero-eyebrow">New music and SFX added weekly.</p>
      {!backgroundOnly && (
        <>
          <div className="audioflume-experiment-hero-shade" aria-hidden="true" />
          <AudioflumeMark className="audioflume-experiment-hero-mark" />
          <h1 className="audioflume-experiment-hero-headline">
            <span>HUMAN</span><span>MADE</span><span>MUSIC</span><span>&amp; SFX</span><span>FOR</span><span>FILM.</span>
          </h1>
          <img className="audioflume-experiment-hero-overlay" src={HERO_OVERLAY} alt="" />
          <Link className="audioflume-experiment-hero-link" href="/music">
            Explore music library <ArrowUpRightIcon size={24} strokeWidth={1.5} />
          </Link>
        </>
      )}
    </section>
  );
}

export function HomeLandingPromoBlocks({ artistsImage = ARTISTS_IMAGE, showCurated = true, curatedRightBlock = false }: { artistsImage?: string; showCurated?: boolean; curatedRightBlock?: boolean } = {}) {
  return (
    <>
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
            <img src={curatedRightBlock ? CURATED_IMAGE : artistsImage} alt="" />
            <h2>{curatedRightBlock ? <>Thoughtfully curated playlists<br />for every story.</> : <>A growing collection of in<br />demand artists and composers.</>}</h2>
            <Link href={curatedRightBlock ? "/curated-playlists" : "/artists"}>{curatedRightBlock ? "Explore curated collections" : "Discover new artists"} <ArrowUpRightIcon size={24} strokeWidth={1.5} /></Link>
          </div>
        </section>

        {showCurated && <section className="audioflume-experiment-curated" aria-label="Curated playlists">
          <img src={CURATED_IMAGE} alt="" />
          <div className="audioflume-experiment-curated-brand">
            <h2>HUMAN MADE MUSIC.<br />STORY DRIVEN SOUND.</h2>
          </div>
          <p>Curated playlists for editors.</p>
          <Link href="/curated-playlists">
            Explore curated collections <ArrowUpRightIcon size={24} strokeWidth={1.5} />
          </Link>
        </section>}

    </>
  );
}

function HomeIntroSection() {
  return (
    <section className="audioflume-home-intro" aria-label="Explore human-made music">
      <div className="audioflume-home-intro-main">
        <div className="audioflume-home-intro-copy">
          <div className="audioflume-home-intro-seal">
            <AudioflumeMark className="audioflume-home-intro-mark" />
            <span>Human made. Story driven.</span>
          </div>
          <h1>Music for the stories you tell.</h1>
          <p>Human-made music and sound effects for filmmakers, editors, and storytellers. Find the sound that makes your next project feel something.</p>
          <div className="audioflume-home-intro-actions">
            <Link href="/music" className="audioflume-home-intro-primary">Explore music library <ArrowUpRightIcon size={20} strokeWidth={1.5} /></Link>
            <Link href="/curated-playlists" className="audioflume-home-intro-secondary">Explore curated playlists</Link>
          </div>
          <div className="audioflume-home-intro-rating">
            <span aria-hidden="true" className="audioflume-home-intro-stars">
              {Array.from({ length: 5 }, (_, index) => (
                <svg key={index} viewBox="0 0 24 24" fill="currentColor" focusable="false">
                  <path d="M12 1L14.84 8.16L22.54 8.65L16.61 13.58L18.51 21.05L12 16.91L5.49 21.05L7.39 13.58L1.46 8.65L9.16 8.16Z" />
                </svg>
              ))}
            </span>
            <span>Music made for filmmakers and storytellers</span>
          </div>
        </div>
        <div className="audioflume-home-intro-visual">
          <img className="audioflume-home-intro-photo" src={ARTISTS_IMAGE} alt="Behind-the-scenes filmmaking photography" />
          <div className="audioflume-home-intro-artwork audioflume-home-intro-artwork-upper">
            <img src={COLLAGE_IMAGE} alt="" />
          </div>
          <div className="audioflume-home-intro-artwork">
            <img src={CURATED_IMAGE} alt="" />
          </div>
        </div>
      </div>
      <div className="audioflume-home-intro-logos">
        <span>Sound for stories that go further.</span>
        <img
          src="https://images.filmwave.io/images/home/logos.png"
          alt="Brands whose filmmakers use Audioflume"
          draggable={false}
        />
      </div>
    </section>
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
      <div className="audioflume-experiment-main">
        <HomeIntroSection />
        <section className="audioflume-home-intro-statement" aria-label="Human made music and SFX for film">
          <p>Human made music &amp; SFX for film.</p>
        </section>
        <HomeHeroBanner featuredSong={featuredSong} />

        <HomeLandingPromoBlocks />

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
