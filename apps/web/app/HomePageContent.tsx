"use client";

import { MusicListShell } from "@filmwave/shared";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import Footer from "@/components/Footer";
import SectionTitle from "@/components/SectionTitle";
import SongCard from "@/components/SongCard";
import CuratedBrowseFilters from "@/components/curated/CuratedBrowseFilters";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import { playlistDetailActionButtonClass } from "@/components/uiClasses";
import { usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

import "@/components/curated/curated-browse-filters.css";
import "./music/music-library-redesign.css";
import "./home-page.css";

const NEW_SONG_COUNT = 10;
const HERO_BACKGROUND_IMAGE =
  "https://images.filmwave.io/images/discover/b7cb4a48-bd82-44d1-b02e-c104dac45339-gigapixel-low%20resolution%20v2-2x.jpeg";
const HOME_HERO_VIDEO_URL =
  "https://pub-cd585d75522a44bb9dad78b6f9974d03.r2.dev/Audioflume%20Banner.mov";

const HOME_HEADLINE = "Human Curated Music & SFX Library for Filmmakers and Your Clients";
const HOME_DESCRIPTION =
  "A highly curated library of royalty free audio and sound effects made with intention for filmmakers.";

function SignUpButton() {
  return (
    <Link
      href="/sign-up"
      className={`${playlistDetailActionButtonClass} audioflume-home-signup-button bg-black text-white`}
    >
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
          <Link className="audioflume-home-media-value-link" href="/music">
            <strong>
              Human Curated Music Library
              <ArrowUpRightIcon
                size={16}
                className="audioflume-home-media-value-arrow"
              />
            </strong>
            <span>
              Human-picked tracks, thoughtful moods, and music chosen for real
              edits.
            </span>
          </Link>

          <Link className="audioflume-home-media-value-link" href="/sound-fx">
            <strong>
              Thousands of Sound Effects
              <ArrowUpRightIcon
                size={16}
                className="audioflume-home-media-value-arrow"
              />
            </strong>
            <span>
              Thousands of sound effects, textures, and details for richer
              edits.
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}

function HomeBrowseFilters() {
  return (
    <CuratedBrowseFilters
      className="audioflume-home-filter-row"
      ariaLabel="Browse curated playlists"
      hrefForFilter={(filter) =>
        `/curated-playlists?filter=${encodeURIComponent(filter)}`
      }
    />
  );
}

function HomeArtworkCollage({ playlists }: { playlists: CuratedPlaylist[] }) {
  const images = Array.from({ length: 6 }, (_, index) => {
    if (index === 0) {
      return "https://images.filmwave.io/images/home/Audioflume%20Home%20Images%201.jpg";
    }
    if (index === 1) {
      return "https://images.filmwave.io/images/home/Audioflume%20Home%20Images%203.jpg";
    }
    if (index === 2) {
      return "https://images.filmwave.io/images/home/Audioflume%20Home%20Images%202.jpg";
    }

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
    <section className="audioflume-home-songs">
      <div className="mb-4 flex min-h-[34px] items-center justify-between gap-5">
        <SectionTitle>Newly Added Tracks</SectionTitle>
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
                className="mb-0.5 h-16 w-full bg-[var(--bg-secondary)]"
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
  const { setQueue } = usePlayer();
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
        .slice(0, 6),
    [playlists],
  );

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
      </div>

      <Footer className="mt-16" />
    </main>
  );
}
