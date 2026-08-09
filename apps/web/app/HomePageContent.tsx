"use client";

import { MusicListShell } from "@filmwave/shared";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import Footer from "@/components/Footer";
import SongCard from "@/components/SongCard";
import { usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import {
  CURATED_BROWSE_FILTERS,
  type CuratedPlaylist,
} from "@/lib/curatedPlaylists";

import "./music/music-library-redesign.css";
import "./home-page.css";

const NEW_SONG_COUNT = 10;
const HERO_BACKGROUND_IMAGE =
  "https://images.filmwave.io/images/discover/b7cb4a48-bd82-44d1-b02e-c104dac45339-gigapixel-low%20resolution%20v2-2x.jpeg";
const HOME_HERO_VIDEO_URL =
  "https://pub-cd585d75522a44bb9dad78b6f9974d03.r2.dev/Audioflume%20Banner.mov";

const HOME_HEADLINE = "Human Curated Music & SFX for Filmmakers and Your Clients";
const HOME_DESCRIPTION =
  "A highly curated library of royalty free audio and sound effects made with intention for filmmakers.";

function SignUpButton() {
  return (
    <Link href="/sign-up" className="audioflume-home-signup-button">
      Sign up today
    </Link>
  );
}

function HomeIntro() {
  return (
    <section className="audioflume-home-intro">
      <h1>{HOME_HEADLINE}</h1>

      <div className="audioflume-home-intro-copy">
        <span className="audioflume-home-eyebrow">Sign up today</span>
        <p>{HOME_DESCRIPTION}</p>
        <div className="audioflume-home-intro-action-row">
          <SignUpButton />
          <span className="audioflume-home-intro-note">
            Sign up today totally free! Monthly plans or music for life available.
          </span>
        </div>
      </div>
    </section>
  );
}

function HomeHeroMedia() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanSearch = search.trim();
    router.push(
      cleanSearch
        ? `/music?search=${encodeURIComponent(cleanSearch)}`
        : "/music",
    );
  }

  return (
    <section className="audioflume-home-hero-media" aria-label="Discover music">
      <Image
        src={HERO_BACKGROUND_IMAGE}
        alt=""
        fill
        priority
        unoptimized
        sizes="calc(100vw - 40px)"
        className="audioflume-home-hero-image"
      />
      <video
        className="audioflume-home-hero-video pointer-events-none absolute inset-0 h-full w-full object-cover"
        src={HOME_HERO_VIDEO_URL}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />
      <div className="audioflume-home-hero-overlay" aria-hidden="true" />

      <div className="audioflume-home-hero-content">
        <form className="audioflume-home-search" onSubmit={handleSubmit}>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Describe a scene, mood, or feeling"
            aria-label="Search music library"
          />
          <button type="submit" aria-label="Search music library">
            <span aria-hidden="true">→</span>
          </button>
        </form>

        <div className="audioflume-home-media-values">
          <Link href="/music">
            <strong>Human curated music library ↗</strong>
            <span>
              Human-picked tracks, thoughtful moods, and music chosen for real edits.
            </span>
          </Link>
          <Link href="/sound-fx">
            <strong>Thousands of sound effects ↗</strong>
            <span>
              Thousands of sound effects, textures, and details for richer edits.
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function HomeBrowseFilters() {
  return (
    <nav className="audioflume-home-filter-row" aria-label="Browse curated playlists">
      {CURATED_BROWSE_FILTERS.map((filter) => (
        <Link key={filter.value} href="/curated-playlists">
          {filter.label}
        </Link>
      ))}
    </nav>
  );
}

function HomeArtworkCollage({ playlists }: { playlists: CuratedPlaylist[] }) {
  const images = Array.from({ length: 5 }, (_, index) => {
    const playlist = playlists[index % Math.max(playlists.length, 1)];
    return playlist?.cover_image_url || HERO_BACKGROUND_IMAGE;
  });

  return (
    <div className="audioflume-home-collage" aria-hidden="true">
      {images.map((src, index) => (
        <div
          key={`${src}-${index}`}
          className={`audioflume-home-collage-item item-${index + 1}`}
        >
          <Image
            src={src}
            alt=""
            fill
            unoptimized
            sizes="320px"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}

function HomeStatement({ playlists }: { playlists: CuratedPlaylist[] }) {
  return (
    <section className="audioflume-home-statement">
      <div className="audioflume-home-statement-copy">
        <span className="audioflume-home-eyebrow">Sign up today</span>
        <h2>{HOME_HEADLINE}</h2>
        <p>{HOME_DESCRIPTION}</p>
        <SignUpButton />
      </div>

      <HomeArtworkCollage playlists={playlists} />
    </section>
  );
}

function HomeSongs({
  songs,
  loading,
}: {
  songs: ReturnType<typeof useSongs>["songs"];
  loading: boolean;
}) {
  if (!loading && songs.length === 0) return null;

  return (
    <section className="discover-section discover-song-section audioflume-home-songs">
      <div
        className="discover-section-heading"
        style={{ alignItems: "baseline" }}
      >
        <h2>Newly Added Tracks</h2>
        <Link
          href="/music"
          className="text-xs font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]"
        >
          Explore music library
        </Link>
      </div>

      <MusicListShell title={null}>
        {loading
          ? Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="discover-song-skeleton discover-card-skeleton"
                aria-hidden="true"
              />
            ))
          : songs.map((song) => <SongCard key={song.id} song={song} />)}
      </MusicListShell>

      <div className="mt-5 flex justify-center">
        <Link
          href="/music"
          className="inline-flex h-11 min-w-[280px] items-center justify-center rounded-none bg-[var(--filmwave-neutral-surface)] px-10 text-[13px] font-medium text-[var(--text-primary)] transition-colors hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] focus-visible:bg-[var(--text-primary)] focus-visible:text-[var(--bg-primary)] focus-visible:outline-none"
        >
          Explore music library
        </Link>
      </div>
    </section>
  );
}

export default function HomePageContent() {
  const { songs, loading: songsLoading } = useSongs();
  const { currentSong, setQueue } = usePlayer();
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/curated-playlists")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) {
          setPlaylists(data as CuratedPlaylist[]);
        }
      })
      .catch(() => {
        if (!cancelled) setPlaylists([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const playableSongs = useMemo(
    () => songs.filter((song) => Boolean(song.audioUrl)),
    [songs],
  );
  const recentSongs = playableSongs.slice(0, NEW_SONG_COUNT);
  const visualPlaylists = useMemo(
    () =>
      playlists
        .filter((playlist) => Boolean(playlist.cover_image_url))
        .slice(0, 5),
    [playlists],
  );
  const playerVisible = Boolean(currentSong);

  useEffect(() => {
    if (!songsLoading) setQueue(playableSongs);
  }, [playableSongs, setQueue, songsLoading]);

  return (
    <main className="audioflume-home-page-root">
      <HomeIntro />
      <HomeHeroMedia />
      <HomeBrowseFilters />
      <HomeStatement playlists={visualPlaylists} />

      <div className="audioflume-home-content">
        <HomeSongs songs={recentSongs} loading={songsLoading} />
        <div
          className="discover-footer-wrap"
          style={{ paddingBottom: playerVisible ? "72px" : "8px" }}
        >
          <Footer />
        </div>
      </div>
    </main>
  );
}
