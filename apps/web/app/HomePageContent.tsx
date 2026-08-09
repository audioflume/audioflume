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
import {
  playlistDetailActionButtonClass,
  playlistDetailPrimaryActionButtonClass,
} from "@/components/uiClasses";
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

const HOME_HEADLINE = "Human Curated Music & SFX Licensed for Filmmakers and Their Clients.";
const HOME_STATEMENT_HEADLINE =
  "Every Track and Sound Effect Built Specifically For Editors.";
const HOME_DESCRIPTION =
  "A highly curated library of royalty-free audio and sound effects made with intention for filmmakers.";
const HOME_STATEMENT_DESCRIPTION =
  "Premium film-forward music and SFX built to work naturally with picture, pacing, emotion, and story.";
const HOME_CURATED_PLAYLIST_HEADLINE =
  "Human Curated Playlists Made by Real Filmmakers.";
const HOME_CURATED_PLAYLIST_DESCRIPTION =
  "Playlists shaped by real working filmmakers that help find the right track faster and cut through the noise.";

const BOTTOM_WAVEFORM_BAR_DATA =
  "230.01,6.34,8.99;227.51,2.26,17.14;225.01,5.31,11.05;222.51,2.47,16.73;220.01,4.48,12.7;217.51,2.67,16.33;215.01,5.98,9.71;212.51,2.91,15.84;210.01,5.38,10.92;207.51,2.79,16.09;255.01,2.81,16.04;252.51,4.89,11.89;250.01,2.14,17.39;247.51,4.1,13.47;245.01,3.89,13.89;242.51,3.41,14.86;240.01,3.41,14.85;237.51,2.77,16.12;235.01,4.42,12.84;232.51,3.53,14.6;280.01,2.43,16.81;277.51,4.91,11.86;275.01,4.33,13.02;272.51,6.23,9.21;270.01,1.47,18.72;267.51,4.82,12.03;265.01,3.15,15.38;262.51,4.28,13.11;260.01,1.44,18.79;257.51,5.81,10.06;305.01,4.07,13.52;302.51,1.9,17.88;300.01,6.11,9.46;297.51,2.81,16.06;295.01,5.36,10.95;292.51,2.93,15.81;290.01,3.36,14.96;287.51,4,13.67;285.01,3.19,15.29;282.51,5.85,9.97;330.01,3.59,14.5;327.51,3.23,15.22;325.01,4.88,11.92;322.51,2.26,17.14;320.01,4.28,13.12;317.51,3.63,14.41;315.01,6.96,7.76;312.51,2.16,17.35;310.01,4.74,12.18;307.51,2.59,16.48;355.02,1.5,18.68;352.52,5.35,10.98;350.02,2.82,16.04;347.52,3.77,14.13;345.02,2.77,16.14;342.52,3.79,14.09;340.02,4.99,11.68;337.51,4.43,12.8;335.01,1.05,19.57;332.51,1.46,18.75;380.02,4.26,13.16;377.52,2.39,16.9;375.02,1.8,18.08;372.52,2.35,16.98;370.02,4.93,11.81;367.52,6.25,9.17;365.02,2.38,16.9;362.52,3.81,14.06;360.02,4.98,11.71;357.52,5.48,10.71;405.02,5.12,11.44;402.52,4.49,12.69;400.02,5.45,10.76;397.52,1.63,18.41;395.02,4.88,11.91;392.52,3.43,14.82;390.02,3.86,13.94;387.52,3.42,14.84;385.02,2.59,16.49;382.52,3.97,13.72;430.02,9.86,1.95;427.52,9.91,1.86;425.02,9.38,2.91;422.52,5.92,9.83;420.02,1.22,19.24;417.52,1.47,18.74;415.02,2.43,16.81;412.52,4.88,11.92;410.02,6.31,9.04;407.52,1.43,18.81;437.52,9.9,1.86;435.02,9.9,1.86;432.52,9.9,1.86;182.5,2.82,16.04;185,4.89,11.89;187.5,2.14,17.39;190,4.1,13.47;192.5,3.89,13.89;195,3.4,14.86;197.5,3.41,14.85;200.01,2.78,16.12;202.51,4.41,12.84;157.5,2.43,16.81;160,4.9,11.86;162.5,4.32,13.02;165,6.23,9.21;167.5,1.48,18.72;170,4.82,12.03;172.5,3.14,15.38;175,4.28,13.11;177.5,1.44,18.79;180,5.8,10.06;132.5,4.08,13.52;135,1.89,17.88;137.5,6.1,9.46;140,2.8,16.06;142.5,5.36,10.95;145,2.93,15.81;147.5,3.35,14.96;150,4,13.67;152.5,3.19,15.29;155,5.85,9.97;107.51,3.58,14.5;110.01,3.22,15.22;112.51,4.87,11.92;115,2.27,17.14;117.5,4.27,13.12;120,3.63,14.41;122.5,6.95,7.76;125,2.16,17.35;127.5,4.75,12.18;130,2.6,16.48;82.5,1.49,18.68;85.01,5.34,10.98;87.51,2.81,16.04;90.01,3.77,14.13;92.51,2.76,16.14;95.01,3.79,14.09;97.51,5,11.68;100.01,4.44,12.8;102.51,1.05,19.57;105.01,1.46,18.75;57.5,4.25,13.16;60,2.38,16.9;62.5,1.79,18.08;65,2.34,16.98;67.5,4.93,11.81;70,6.25,9.17;72.5,2.39,16.9;75,3.8,14.06;77.5,4.98,11.71;80,5.48,10.71;32.5,5.11,11.44;35,4.49,12.69;37.5,5.46,10.76;40,1.63,18.41;42.5,4.88,11.91;45,3.42,14.82;47.5,3.87,13.94;50,3.41,14.84;52.5,2.59,16.49;55,3.98,13.72;7.5,9.86,1.95;10,9.9,1.86;12.5,9.38,2.91;15,5.92,9.83;17.5,1.21,19.24;20,1.46,18.74;22.5,2.43,16.81;25,4.87,11.92;27.5,6.32,9.04;30,1.43,18.81;0,9.91,1.86;2.5,9.91,1.86;5,9.91,1.86;205.01,3.54,14.6";
const TOP_WAVEFORM_BAR_DATA =
  "182.5,2.45,16.04;185,4.52,11.89;187.5,1.77,17.39;190,3.73,13.47;192.5,3.52,13.89;195,3.03,14.86;197.5,3.04,14.85;157.5,2.06,16.81;160,4.53,11.86;162.5,3.95,13.02;165,5.86,9.21;167.5,1.11,18.72;170,4.45,12.03;172.5,2.77,15.38;175,3.91,13.11;177.5,1.07,18.79;180,5.43,10.06;132.5,3.71,13.52;135,1.52,17.88;137.5,5.73,9.46;140,2.43,16.06;142.5,4.99,10.95;145,2.56,15.81;147.5,2.98,14.96;150,3.63,13.67;152.5,2.82,15.29;155,5.48,9.97;107.51,3.21,14.5;110.01,2.85,15.22;112.51,4.5,11.92;115,1.9,17.14;117.5,3.9,13.12;120,3.26,14.41;122.5,6.58,7.76;125,1.79,17.35;127.5,4.38,12.18;130,2.23,16.48;82.5,1.12,18.68;85.01,4.97,10.98;87.51,2.44,16.04;90.01,3.4,14.13;92.51,2.39,16.14;95.01,3.42,14.09;97.51,4.63,11.68;100.01,4.07,12.8;102.51,0.68,19.57;105.01,1.09,18.75;57.5,3.88,13.16;60,2.01,16.9;62.5,1.42,18.08;65,1.97,16.98;67.5,4.56,11.81;70,5.88,9.17;72.5,2.02,16.9;75,3.43,14.06;77.5,4.61,11.71;80,5.11,10.71;32.5,4.74,11.44;35,4.12,12.69;37.5,5.08,10.76;40,1.26,18.41;42.5,4.51,11.91;45,3.05,14.82;47.5,3.49,13.94;50,3.04,14.84;52.5,2.22,16.49;55,3.61,13.72;7.5,9.49,1.95;10,9.53,1.86;12.5,9.01,2.91;15,5.55,9.83;17.5,0.84,19.24;20,1.09,18.74;22.5,2.06,16.81;25,4.5,11.92;27.5,5.95,9.04;30,1.06,18.81;0,9.54,1.86;2.5,9.54,1.86;5,9.54,1.86;205.01,3.17,14.6;415.01,4,12.93;417.51,7.95,5.03;420.01,7.88,5.17;422.51,8.55,3.82;425.02,8.56,3.8;427.52,8.1,4.73;430.02,8.37,4.2;432.52,8.56,3.82;435.02,8.33,4.27;437.52,8.75,3.42;390.01,5.97,8.99;392.51,1.89,17.14;395.01,4.94,11.05;397.51,2.1,16.73;400.01,4.12,12.7;402.51,2.3,16.33;405.01,5.61,9.71;407.51,2.55,15.84;410.01,5,10.92;412.51,2.42,16.09;365.01,2.45,16.04;367.51,4.52,11.89;370.01,1.77,17.39;372.51,3.73,13.47;375.01,3.52,13.89;377.51,3.03,14.86;380.01,3.04,14.85;382.51,2.41,16.12;385.01,4.04,12.84;387.51,3.17,14.6;340.01,2.06,16.81;342.51,4.53,11.86;345.01,3.95,13.02;347.51,5.86,9.21;350.01,1.11,18.72;352.51,4.45,12.03;355.01,2.77,15.38;357.51,3.91,13.11;360.01,1.07,18.79;362.51,5.43,10.06;315.02,3.71,13.52;317.52,1.52,17.88;320.02,5.73,9.46;322.52,2.43,16.06;325.02,4.99,10.95;327.52,2.56,15.81;330.02,2.98,14.96;332.52,3.63,13.67;335.02,2.82,15.29;337.52,5.48,9.97;290.01,3.21,14.5;292.51,2.85,15.22;295.01,4.5,11.92;297.51,1.9,17.14;300.01,3.9,13.12;302.51,3.26,14.41;305.01,6.58,7.76;307.51,1.79,17.35;310.01,4.38,12.18;312.52,2.23,16.48;265.01,1.12,18.68;267.51,4.97,10.98;270.01,2.44,16.04;272.51,3.4,14.13;275.01,2.39,16.14;277.51,3.42,14.09;280.01,4.63,11.68;282.51,4.07,12.8;285.01,0.68,19.57;287.51,1.09,18.75;240.01,3.88,13.16;242.51,2.01,16.9;245.01,1.42,18.08;247.51,1.97,16.98;250.01,4.56,11.81;252.51,5.88,9.17;255.01,2.02,16.9;257.51,3.43,14.06;260.01,4.61,11.71;262.51,5.11,10.71;215.01,4.74,11.44;217.51,4.12,12.69;220.01,5.08,10.76;222.51,1.26,18.41;225.01,4.51,11.91;227.51,3.05,14.82;230.01,3.49,13.94;232.51,3.04,14.84;235.01,2.22,16.49;237.51,3.61,13.72;200.01,0.84,19.24;202.51,1.09,18.74;205.01,2.06,16.81;207.51,4.5,11.92;210.01,5.95,9.04;212.51,1.06,18.81";

function parseWaveformBars(data: string) {
  return data.split(";").map((bar) => bar.split(",").map(Number));
}

const BOTTOM_WAVEFORM_BARS = parseWaveformBars(BOTTOM_WAVEFORM_BAR_DATA);
const TOP_WAVEFORM_BARS = parseWaveformBars(TOP_WAVEFORM_BAR_DATA);

function SignUpButton() {
  return (
    <Link
      href="/sign-up"
      className={`${playlistDetailPrimaryActionButtonClass} audioflume-home-signup-button hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`}
    >
      Sign up today
    </Link>
  );
}

function HomeIntro() {
  return (
    <section className="audioflume-home-intro">
      <div>
        <span className="audioflume-home-eyebrow">LICENSED FOR FILM</span>
        <h1>{HOME_HEADLINE}</h1>
      </div>

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
      return "https://images.filmwave.io/images/home/Audioflume%20Home%20Images%204.jpg";
    }
    if (index === 1) {
      return "https://images.filmwave.io/images/home/Audioflume%20Home%20Images%202.jpg";
    }
    if (index === 2) {
      return "https://images.filmwave.io/images/home/Audioflume%20Home%20Images%205.jpg";
    }
    if (index === 3) {
      return "https://images.filmwave.io/images/home/Audioflume%20Home%20Images%208.jpg";
    }
    if (index === 4) {
      return "https://images.filmwave.io/images/home/Audioflume%20Home%20Images%209.jpg";
    }
    if (index === 5) {
      return "https://images.filmwave.io/images/home/Audioflume%20Home%20Images%207.jpg";
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
        <span className="audioflume-home-eyebrow">Built for Editors</span>
        <h2>{HOME_STATEMENT_HEADLINE}</h2>
        <p>{HOME_STATEMENT_DESCRIPTION}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/music"
            className={`${playlistDetailPrimaryActionButtonClass} hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`}
          >
            Explore Music Library
          </Link>
          <Link
            href="/sound-fx"
            className={`${playlistDetailActionButtonClass} border border-[var(--border)] bg-transparent text-[var(--text-primary)] hover:border-[var(--text-primary)] hover:bg-[var(--text-primary)] hover:text-[var(--bg-primary)] focus-visible:border-[var(--text-primary)] focus-visible:bg-[var(--text-primary)] focus-visible:text-[var(--bg-primary)] focus-visible:outline-none`}
          >
            Explore SFX
          </Link>
        </div>
      </div>

      <HomeArtworkCollage playlists={playlists} />
    </section>
  );
}

function HomeWaveform({ bars }: { bars: number[][] }) {
  return (
    <svg
      className="audioflume-home-mock-waveform"
      viewBox="0 0 438.98 20.93"
      aria-hidden="true"
      style={{ display: "block", height: "auto" }}
    >
      {bars.map(([x, y, height], index) => (
        <rect
          key={`${x}-${y}-${index}`}
          x={x}
          y={y}
          width="1.46"
          height={height}
          fill="#bdbdbd"
        />
      ))}
    </svg>
  );
}

function HomePlaylistFeatureVisual() {
  return (
    <section
      className="audioflume-home-playlist-feature"
      aria-label="Playlist workflow preview"
    >
      <div className="audioflume-home-playlist-feature-inner">
        <div className="audioflume-home-playlist-stack" aria-hidden="true">
          <div className="audioflume-home-playlist-card card-1">
            <Image
              src="https://images.filmwave.io/images/home/Audioflume%20Home%20Images%2012.jpg"
              alt=""
              fill
              unoptimized
              sizes="640px"
              className="object-cover"
            />
            <span className="audioflume-home-playlist-card-arrow">
              <ArrowUpRightIcon size={16} />
            </span>
          </div>
          <div className="audioflume-home-playlist-card card-2">
            <Image
              src="https://images.filmwave.io/images/home/Audioflume%20Home%20Images%2011.jpg"
              alt=""
              fill
              unoptimized
              sizes="640px"
              className="object-cover"
            />
            <span className="audioflume-home-playlist-card-arrow">
              <ArrowUpRightIcon size={16} />
            </span>
          </div>
          <div className="audioflume-home-playlist-card card-3">
            <Image
              src="https://images.filmwave.io/images/home/Audioflume%20Home%20Images%2010.jpg"
              alt=""
              fill
              unoptimized
              sizes="640px"
              className="object-cover"
            />
            <span className="audioflume-home-playlist-card-arrow">
              <ArrowUpRightIcon size={16} />
            </span>
            <span className="audioflume-home-playlist-card-play" />
          </div>
        </div>

        <div className="audioflume-home-statement-copy audioflume-home-playlist-feature-copy">
          <span className="audioflume-home-eyebrow">Human Curated Playlists</span>
          <h2>{HOME_CURATED_PLAYLIST_HEADLINE}</h2>
          <p>{HOME_CURATED_PLAYLIST_DESCRIPTION}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href="/curated-playlists"
              className={`${playlistDetailPrimaryActionButtonClass} hover:opacity-80 focus-visible:opacity-80 focus-visible:outline-none`}
            >
              Explore Curated Playlists
            </Link>
          </div>
        </div>
      </div>

      <div className="audioflume-home-waveform audioflume-home-waveform-one">
        <HomeWaveform bars={TOP_WAVEFORM_BARS} />
      </div>
      <div className="audioflume-home-waveform audioflume-home-waveform-two">
        <HomeWaveform bars={BOTTOM_WAVEFORM_BARS} />
      </div>
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
      <HomePlaylistFeatureVisual />

      <div className="audioflume-home-content">
        <HomeSongs songs={recentSongs} loading={songsLoading} />
      </div>

      <Footer className="mt-16" />
    </main>
  );
}