"use client";

import Link from "next/link";
import { useMemo } from "react";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import SongCard from "@/components/SongCard";
import { useSongs } from "@/hooks/useSongs";
import Discover2MixedCarousel from "../discover2/Discover2MixedCarousel";
import Discover3ArtistShelves from "./Discover3ArtistShelves";
import styles from "./Discover3.module.css";
import "../home-page.css";

export default function Discover3Page() {
  const { songs, loading } = useSongs();
  const recentSongs = useMemo(() => songs.filter((song) => Boolean(song.audioUrl)).slice(0, 8), [songs]);

  return (
    <main className={styles.page}>
      <GlobalSearchBar position="flow" musicFieldStyle darkSimilarButton />
      <header className={styles.intro}>
        <h1>Human made music &amp; SFX for film.</h1>
        <p>Discover a thoughtfully curated collection of human-made music, crafted to bring stories to life.</p>
      </header>
      <Discover3ArtistShelves featured />
      <h2 className={styles.sectionHeading}><Link href="/artists">Artists we’re watching</Link></h2>
      <Discover3ArtistShelves />
      <section className={styles.collection} aria-label="Discover music, artists and playlists">
        <h2>Discover a thoughtfully curated collection of human-made music, crafted to bring stories to life.</h2>
        <Discover2MixedCarousel songs={songs} variant="discover3" />
      </section>
      <section className={styles.newMusic} aria-label="Newly added music">
        <h2 className={styles.sectionHeading}><Link href="/music">Newly added music</Link></h2>
        <div className={styles.songRows}>
          {loading ? <p className={styles.loading} role="status">Loading new music…</p> : recentSongs.map((song) => <SongCard key={song.id} song={song} showDivider={false} />)}
        </div>
      </section>
    </main>
  );
}
