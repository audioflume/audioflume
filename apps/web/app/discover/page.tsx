"use client";

import Link from "next/link";
import { useMemo } from "react";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import Footer from "@/components/Footer";
import SongCard from "@/components/SongCard";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import { MusicListShell } from "@filmwave/shared";
import { useSongs } from "@/hooks/useSongs";
import Discover2MixedCarousel from "../discover2/Discover2MixedCarousel";
import Discover3ArtistShelves from "../discover3/Discover3ArtistShelves";
import Discover3Playlists from "../discover3/Discover3Playlists";
import styles from "../discover3/Discover3.module.css";
import { HomeReadyToCutSongCard, HomeTrendingSkeleton } from "../HomePageContent";
import "../home-page.css";

export default function Discover3Page() {
  const { songs, loading } = useSongs();
  const recentSongs = useMemo(() => songs.filter((song) => Boolean(song.audioUrl)).slice(0, 10), [songs]);
  const storySongs = useMemo(() => songs.filter((song) => Boolean(song.audioUrl)).slice(0, 12), [songs]);

  return (
    <main className={styles.page}>
      <GlobalSearchBar position="flow" musicFieldStyle darkSimilarButton />
      <header className={styles.intro}>
        <h1>Human made music &amp; SFX for film.</h1>
        <div className={styles.introRating}>
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
      </header>
      <Discover3ArtistShelves featured />
      <h2 className={`${styles.sectionHeading} discover3-heading-scope`}>
        <Link className="discover2-watching-heading-link" href="/artist2" aria-label="Explore artists">
          <span className="discover2-watching-heading-default" aria-hidden="true">Artists we’re watching</span>
          <span className="discover2-watching-heading-hover" aria-hidden="true">
            Explore artists
            <svg className="discover2-watching-heading-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
              <path d="M4 21 19 5M4 5h15v15" />
            </svg>
          </span>
        </Link>
      </h2>
      <Discover3ArtistShelves />
      <section className={styles.collection} aria-label="Discover music, artists and playlists">
        <h2>Discover a thoughtfully curated collection of human-made music, crafted to bring stories to life.</h2>
        <Discover2MixedCarousel songs={songs} variant="discover3" />
      </section>
      <section className={`${styles.newMusic} audioflume-home-reference-new-songs`} aria-label="Newly added music">
        <h2 className={`${styles.sectionHeading} discover3-heading-scope`}>
        <Link className="discover2-watching-heading-link" href="/music" aria-label="Explore new music">
          <span className="discover2-watching-heading-default" aria-hidden="true">Newly added music</span>
          <span className="discover2-watching-heading-hover" aria-hidden="true">
            Explore new music
            <svg className="discover2-watching-heading-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
              <path d="M4 21 19 5M4 5h15v15" />
            </svg>
          </span>
        </Link>
      </h2>
        <div className={styles.songRows}>
          {loading ? <p className={styles.loading} role="status">Loading new music…</p> : (
            <MusicListShell title={null}>
              {recentSongs.map((song, index) => {
                const card = <SongCard key={song.id} song={song} showDivider={false} showDuration={false} showPlaybackStateIcon />;
                if (index < 8) return card;
                const last = index === recentSongs.length - 1;
                return (
                  <div key={song.id} className={`${styles.fadedSong}${last ? ` ${styles.lastSong}` : ""}`}>
                    {card}
                    {last && <Link href="/music" className={styles.exploreMusic}>Explore more music <ArrowUpRightIcon size={18} strokeWidth={1.5} /></Link>}
                  </div>
                );
              })}
            </MusicListShell>
          )}
        </div>
      </section>
      <Discover3Playlists />
      <section className={styles.cta} aria-label="Explore membership">
        <h2 className="discover3-heading-scope">
          <Link className="discover2-watching-heading-link" href="/pricing" aria-label="Explore membership">
            <span className="discover2-watching-heading-default" aria-hidden="true">Find the right sound for your next story.</span>
            <span className="discover2-watching-heading-hover" aria-hidden="true">
              Explore membership
              <svg className="discover2-watching-heading-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
                <path d="M4 21 19 5M4 5h15v15" />
              </svg>
            </span>
          </Link>
        </h2>
      </section>
      <section className={styles.storySongs} aria-label="Tracks for your next story">
        {loading ? <HomeTrendingSkeleton discoverLayout /> : (
          <div className="audioflume-home-reference-width grid gap-2 min-[520px]:grid-cols-2 xl:grid-cols-3">
            {storySongs.map((song, index) => (
              <HomeReadyToCutSongCard key={song.id} song={song} index={index + 30} queue={storySongs} discoverPlaybackIcon />
            ))}
          </div>
        )}
      </section>
      <div className={styles.footer}>
        <Footer pageGutter={false} showTopBorder={false} />
      </div>
    </main>
  );
}
