"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useUser } from "@clerk/nextjs";
import UserMenu from "@/components/UserMenu";
import Waveform from "@/components/Waveform";
import { useTheme } from "@/context/ThemeContext";
import { useSongs } from "@/hooks/useSongs";
import { usePlaylists } from "@/hooks/usePlaylists";
import { usePlayer, usePlayerProgress } from "@/context/PlayerContext";
import { useFavorites } from "@/context/FavoritesContext";
import type { Song } from "@/lib/types";
import GlobalMusicSearchField from "@/components/GlobalMusicSearchField";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";
import { HomeArtistShelf, HomeArtistShelfSkeleton, type HomeArtist } from "@/app/HomePageContent";
import "@/app/home-page.css";
import styles from "./dual-sidebar.module.css";

type IconName = "search" | "compass" | "heart" | "trend" | "list" | "grid" | "user" | "plus" | "chevron" | "left" | "right" | "play" | "pause" | "next" | "prev" | "volume" | "shuffle" | "repeat" | "more" | "music" | "headphones" | "arrow" | "filter" | "close";

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true as const };
  const paths: Record<IconName, ReactNode> = {
    search: <><circle cx="10.8" cy="10.8" r="6.5" /><path d="m16 16 5 5" /></>,
    compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></>,
    heart: <path d="M20.3 5.8c-2-2-5.1-1.8-7.1.2L12 7.2 10.8 6C8.8 4 5.7 3.8 3.7 5.8c-2 2.1-1.7 5.2.2 7.1L12 21l8.1-8.1c1.9-1.9 2.2-5 .2-7.1Z" />,
    trend: <><path d="m3 17 6-6 4 4 8-9" /><path d="M15 6h6v6" /></>,
    list: <><path d="M8 6h13M8 12h13M8 18h13M3 6h1M3 12h1M3 18h1" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21c0-4.2 3.3-6.5 7.5-6.5s7.5 2.3 7.5 6.5" /></>,
    plus: <path d="M12 4v16M4 12h16" />,
    chevron: <path d="m9 6 6 6-6 6" />,
    left: <path d="m15 5-7 7 7 7" />,
    right: <path d="m9 5 7 7-7 7" />,
    play: <path d="m8 5 12 7-12 7z" fill="currentColor" stroke="none" />,
    pause: <><rect x="6" y="5" width="4" height="14" fill="currentColor" stroke="none" /><rect x="14" y="5" width="4" height="14" fill="currentColor" stroke="none" /></>,
    next: <><path d="m5 5 10 7-10 7z" fill="currentColor" stroke="none" /><path d="M18 5v14" strokeWidth="2.5" /></>,
    prev: <><path d="m19 5-10 7 10 7z" fill="currentColor" stroke="none" /><path d="M6 5v14" strokeWidth="2.5" /></>,
    volume: <><path d="M3 9v6h4l5 4V5L7 9H3z" /><path d="M16 9c2 1.5 2 4.5 0 6M19 6c4 3 4 9 0 12" /></>,
    shuffle: <><path d="M4 7h3c5 0 5 10 10 10h3M17 14l3 3-3 3M4 17h3c2 0 3-1 4-3M15 8c1-.7 2-1 5-1M17 4l3 3-3 3" /></>,
    repeat: <><path d="M20 7H7a4 4 0 0 0-4 4v1M4 7l3-3 3 3M4 17h13a4 4 0 0 0 4-4v-1M20 17l-3 3-3-3" /></>,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" /></>,
    music: <><path d="M9 18V5l11-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="17" cy="16" r="3" /></>,
    headphones: <><path d="M3 14v-3a9 9 0 0 1 18 0v3" /><rect x="2" y="13" width="5" height="8" rx="2" /><rect x="17" y="13" width="5" height="8" rx="2" /></>,
    arrow: <><path d="M5 19 19 5M8 5h11v11" /></>,
    filter: <><path d="M3 5h18M7 12h10M10 19h4" /></>,
    close: <path d="M5 5 19 19M19 5 5 19" />,
  };
  return <svg {...common}>{paths[name]}</svg>;
}

function Cover({ song, className = "" }: { song?: Song | null; className?: string }) {
  return song?.coverArt
    ? <img className={className} src={song.coverArt} alt="" loading="lazy" />
    : <span className={styles.emptyArtwork + " " + className}><Icon name="music" size={26} /></span>;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  return Math.floor(seconds / 60) + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");
}

type View = "discover" | "library" | "liked" | "trending" | "playlists" | "genres" | "artists";

const NAV: { id: View; label: string; icon: IconName }[] = [
  { id: "discover", label: "Discover", icon: "compass" },
  { id: "library", label: "Music library", icon: "music" },
  { id: "liked", label: "Liked tracks", icon: "heart" },
  { id: "trending", label: "Top tracks", icon: "trend" },
  { id: "playlists", label: "Playlists", icon: "list" },
  { id: "genres", label: "Categories", icon: "grid" },
  { id: "artists", label: "Artists", icon: "user" },
];

function SectionHeading({ title, action, href, detail }: { title: ReactNode; action?: string; href?: string; detail?: string }) {
  return (
    <div className={styles.sectionHeader}>
      <h2>{title}</h2>
      {action && href ? (
        <div className={styles.sectionControls}><Link href={href}>{action} <Icon name="arrow" size={14}/></Link></div>
      ) : detail ? <span>{detail}</span> : null}
    </div>
  );
}

export default function DualSidebarExperiment() {
  const { songs, loading, error } = useSongs();
  const { theme } = useTheme();
  const { user, isLoaded: userLoaded } = useUser();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const { playlists } = usePlaylists();
  const { favoriteIds, favoriteIdSet, toggleFavorite } = useFavorites();
  const { currentSong, isPlaying, setQueue, togglePlayPause, navigateTrack, seekTo, volume, setVolume } = usePlayer();
  const { currentTime, duration } = usePlayerProgress();

  const [view, setView] = useState<View>("discover");
  const [query, setQuery] = useState("");
  const [featuredArtists, setFeaturedArtists] = useState<HomeArtist[]>([]);
  const [featuredArtistsLoading, setFeaturedArtistsLoading] = useState(true);
  const [featuredArtistIndex, setFeaturedArtistIndex] = useState(0);
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [shuffle, setShuffle] = useState(false);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onOutsideClick = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) setUserMenuOpen(false);
    };
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onOutsideClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onOutsideClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, [userMenuOpen]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/discover-featured-artists")
      .then(response => {
        if (!response.ok) throw new Error("Failed to load featured artists");
        return response.json();
      })
      .then(data => {
        if (!cancelled) setFeaturedArtists(Array.isArray(data?.artists) ? data.artists : []);
      })
      .catch(() => {
        if (!cancelled) setFeaturedArtists([]);
      })
      .finally(() => {
        if (!cancelled) setFeaturedArtistsLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const playableSongs = useMemo(() => songs.filter(song => Boolean(song.audioUrl)), [songs]);
  const recentSongs = useMemo(() => [...playableSongs].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")), [playableSongs]);
  const genres = useMemo(() => Array.from(new Set(playableSongs.flatMap(song => song.genres || []))).filter(Boolean).slice(0, 14), [playableSongs]);
  const artists = useMemo(() => Array.from(new Set(playableSongs.map(song => song.artist))).filter(Boolean).slice(0, 18), [playableSongs]);

  const visibleSongs = useMemo(() => {
    let pool = view === "library" ? songs : view === "liked" ? playableSongs.filter(song => favoriteIdSet.has(song.id)) : view === "trending" ? [...playableSongs].reverse() : recentSongs;
    if (activeGenre) pool = pool.filter(song => song.genres?.includes(activeGenre));
    const term = query.trim().toLowerCase();
    if (term) pool = pool.filter(song => [song.title, song.artist, ...(song.genres || [])].some(value => value.toLowerCase().includes(term)));
    return pool;
  }, [view, songs, playableSongs, favoriteIdSet, recentSongs, activeGenre, query]);

  const featuredSong = recentSongs[0];
  const displaySong = currentSong || featuredSong || playableSongs[0];
  const sidebarSongs = favoriteIds
    .map(id => playableSongs.find(song => song.id === id))
    .filter((song): song is Song => Boolean(song))
;

  function play(song: Song, queue: Song[] = playableSongs) {
    if (currentSong?.id !== song.id) setQueue(queue);
    togglePlayPause(song);
  }

  const progress = displaySong && currentSong?.id === displaySong.id && duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  const shownDuration = currentSong?.id === displaySong?.id ? duration || displaySong?.duration || 0 : displaySong?.duration || 0;

  return (
    <main className={styles.root} data-theme={theme}>
      <header className={styles.unifiedHeader}>
        <div className={styles.logoRow}>
          <Link href="/" className="filmwave-header-logo-action" aria-label="audioflume Home">
            <span className="filmwave-header-tonal-wordmark">audioflume</span>
          </Link>
        </div>
        <div className={styles.topBar}>
          <div className={styles.searchCombo} role="search" aria-label="Music discovery">
            <GlobalMusicSearchField
              value={query}
              onChange={setQuery}
              onClear={() => setQuery("")}
              className={styles.topSearchField}
              clearButtonClassName={styles.topSearchClear}
            />
            <GlobalReferenceSearch className={styles.findSimilarControl} />
          </div>
        </div>
        <div className={styles.rightTop}>
          {user ? (
            <div className={styles.accountWrap} ref={userMenuRef}>
              <button className={styles.accountTrigger} type="button" aria-label="Open account menu" aria-expanded={userMenuOpen} onClick={() => setUserMenuOpen(open => !open)}>
                <img className={styles.accountAvatar} src={user.imageUrl} alt="" />
                <span className={styles.accountName}>{user.fullName || user.username || user.primaryEmailAddress?.emailAddress || "My account"}</span>
                <Icon name="chevron" size={13} />
              </button>
              {userMenuOpen && <div className={styles.accountMenu}><UserMenu onClose={() => setUserMenuOpen(false)} /></div>}
            </div>
          ) : userLoaded ? (
            <Link href="/sign-in" className={styles.accountSignIn}>Sign in</Link>
          ) : null}
        </div>
      </header>
      <aside className={styles.leftSidebar} aria-label="Experimental navigation">
        <div className={styles.leftScroll}>
          <div className={styles.navList}>
            {NAV.map(item => (
              <button key={item.id} className={styles.navItem + (view === item.id ? " " + styles.navActive : "")} onClick={() => { setView(item.id); setActiveGenre(null); }}>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
          <div className={styles.sidebarSection}>
            <div className={styles.sideSectionHeading}><span>PLAYLISTS</span><Link href="/playlists" title="Manage playlists" aria-label="Manage playlists"><Icon name="plus" size={16}/></Link></div>
            {playlists.length ? <div className={styles.playlistLinks}>{playlists.slice(0, 7).map(playlist => (
              <Link key={playlist.id} href={"/playlists/" + playlist.id} className={styles.playlistLink}><span>{playlist.name}</span></Link>
            ))}</div> : <p className={styles.emptyPlaylists}>Your saved playlists will appear here.</p>}
            <Link href="/playlists" className={styles.createButton}>Browse playlists</Link>
          </div>
        </div>
      </aside>

      <section className={styles.center}>
        <div className={styles.mainScroll}>
          {view !== "library" && <section className={`${styles.featuredArtists} audioflume-home-mockup-artists is-discover-featured-artists`} aria-label="Featured artists">
            {featuredArtistsLoading ? (
              <HomeArtistShelfSkeleton discoverLayout />
            ) : featuredArtists.length > 0 ? (
              <HomeArtistShelf artists={[featuredArtists[featuredArtistIndex % featuredArtists.length]]} homeFlashImages={[]} discoverLayout hideExploreButton />
            ) : (
              <div className={styles.featuredEmpty}>Featured artists are currently unavailable.</div>
            )}
            {featuredArtists.length > 1 && !featuredArtistsLoading && (
              <div className={styles.heroArrows} aria-label="Featured artist navigation">
                <button type="button" onClick={() => setFeaturedArtistIndex(index => (index - 1 + featuredArtists.length) % featuredArtists.length)} aria-label="Previous featured artist"><Icon name="left" size={17}/></button>
                <button type="button" onClick={() => setFeaturedArtistIndex(index => (index + 1) % featuredArtists.length)} aria-label="Next featured artist"><Icon name="right" size={17}/></button>
              </div>
            )}
          </section>}

          {view === "genres" ? <section className={styles.contentSection}>
            <SectionHeading title="Explore by category" detail="Find the feeling" />
            <div className={styles.genreGrid}>{genres.map(genre => <button key={genre} className={styles.genreTile + (activeGenre === genre ? " " + styles.genreSelected : "")} onClick={() => setActiveGenre(activeGenre === genre ? null : genre)}><span>{genre}</span><Icon name="arrow" size={18}/></button>)}</div>
          </section> : view === "artists" ? <section className={styles.contentSection}>
            <SectionHeading title="Artists & composers" action="Explore all" href="/artists" />
            <div className={styles.artistGrid}>{artists.map(artist => <button key={artist} onClick={() => { setView("discover"); setQuery(artist); }}><Icon name="user" size={17}/>{artist}<Icon name="arrow" size={13}/></button>)}</div>
          </section> : view === "playlists" ? <section className={styles.contentSection}>
            <SectionHeading title="Your collections" action="All playlists" href="/playlists" />
            <div className={styles.playlistGrid}>{playlists.map(playlist => <Link href={"/playlists/" + playlist.id} key={playlist.id} className={styles.playlistTile}>{playlist.cover_image_url ? <img src={playlist.cover_image_url} alt="" /> : <span className={styles.emptyArtwork}><Icon name="music" size={24}/></span>}<strong>{playlist.name}</strong></Link>)}{!playlists.length && <p className={styles.status}>You have no saved playlists yet. <Link href="/playlists">Explore playlists</Link></p>}</div>
          </section> : null}

          {view !== "library" && <section className={styles.contentSection}>
            <SectionHeading title={view === "liked" ? "Your liked tracks" : activeGenre ? activeGenre + " tracks" : view === "trending" ? "Explore the catalogue" : "New releases"} action="View all" href="/music" />
            {loading && <p className={styles.status}>Loading the music library…</p>}
            {error && <p className={styles.status}>Could not load songs: {error}</p>}
            {!loading && !visibleSongs.length && <p className={styles.status}>No tracks match this selection.</p>}
            <div className={styles.releaseGrid}>
              {visibleSongs.slice(0, 6).map(song => <button className={styles.releaseCard} key={song.id} onClick={() => play(song, visibleSongs)} title={"Play " + song.title}>
                <span className={styles.releaseCover}><Cover song={song}/><span className={styles.releasePlay}><Icon name={currentSong?.id === song.id && isPlaying ? "pause" : "play"} size={20}/></span></span>
                <strong>{song.title}</strong><span>{song.artist}</span>
              </button>)}
            </div>
          </section>}

          <section className={styles.contentSection + " " + styles.trackSection}>
            <SectionHeading title={view === "library" ? "Music library" : "Tracks worth hearing"} action="Explore all" href="/music" />
            {view === "library" && loading && <p className={styles.status}>Loading the music library…</p>}
            {view === "library" && error && <p className={styles.status}>Could not load songs: {error}</p>}
            {view === "library" && !loading && !visibleSongs.length && <p className={styles.status}>No tracks match this selection.</p>}
            <div className={styles.trackTable}>
              {(view === "library" ? visibleSongs : visibleSongs.slice(0, 10)).map(song => <div className={styles.trackRow + (currentSong?.id === song.id ? " " + styles.trackPlaying : "")} key={song.id}>
                <button className={styles.trackSong} onClick={() => play(song, visibleSongs)}><Cover song={song}/><span><strong>{song.title}</strong><small>{song.artist}</small></span></button>
                <div className={styles.trackWaveform}><Waveform song={song} compact showEditPointMarkers={false} /></div>
                <span className={styles.trackGenre}>{song.genres?.[0] || "—"}</span>
                <span className={styles.trackTime}>{formatTime(song.duration || 0)}</span>
                <button className={styles.likeButton + (favoriteIdSet.has(song.id) ? " " + styles.isLiked : "")} onClick={() => toggleFavorite(song)} aria-label={(favoriteIdSet.has(song.id) ? "Unlike " : "Like ") + song.title}><Icon name="heart" size={16}/></button>
              </div>)}
            </div>
          </section>
        </div>
      </section>

      <aside className={styles.rightSidebar} aria-label="Music player and queue">
        <div className={styles.player}>
          <div className={styles.playerArtwork}><Cover song={displaySong}/></div>
          <div className={styles.playerMeta}><div><h2>{displaySong?.title || "Find something to play"}</h2><p>{displaySong?.artist || "Explore Audioflume's catalogue"}</p></div>{displaySong && <button className={styles.likeButton + (favoriteIdSet.has(displaySong.id) ? " " + styles.isLiked : "")} onClick={() => toggleFavorite(displaySong)} aria-label="Toggle favorite"><Icon name="heart" size={19}/></button>}</div>
          <div className={styles.playerProgress}><input type="range" min={0} max={100} step={0.1} value={progress} disabled={!currentSong} onChange={event => currentSong && seekTo(currentSong, Number(event.target.value) / 100, isPlaying)} style={{ "--range-progress": String(progress) + "%" } as CSSProperties} aria-label="Playback position"/><div><span>{formatTime(currentSong ? currentTime : 0)}</span><span>{formatTime(shownDuration)}</span></div></div>
          <div className={styles.playerButtons}><button className={shuffle ? styles.controlActive : ""} aria-pressed={shuffle} onClick={() => setShuffle(v => !v)} aria-label="Shuffle"><Icon name="shuffle" size={18}/></button><button onClick={() => navigateTrack("prev")} aria-label="Previous track"><Icon name="prev" size={21}/></button><button className={styles.mainPlay} onClick={() => displaySong && play(displaySong, recentSongs)} disabled={!displaySong} aria-label={isPlaying ? "Pause" : "Play"}><Icon name={currentSong?.id === displaySong?.id && isPlaying ? "pause" : "play"} size={22}/></button><button onClick={() => navigateTrack("next")} aria-label="Next track"><Icon name="next" size={21}/></button><button title="Repeat is controlled by the main player" disabled><Icon name="repeat" size={18}/></button></div>
          <div className={styles.volumeRow}><Icon name="volume" size={16}/><input aria-label="Volume" type="range" min={0} max={1} step={0.01} value={volume} onChange={event => setVolume(Number(event.target.value))}/><span>{Math.round(volume * 100)}%</span></div>
        </div>
        <div className={styles.queuePanel}><div className={styles.queueTabs}><span>LIKED</span></div>
          <div className={styles.queueList}>{sidebarSongs.map(song => <button key={song.id} className={styles.queueItem + (song.id === currentSong?.id ? " " + styles.queueCurrent : "")} onClick={() => play(song, sidebarSongs)}><Cover song={song}/><span><strong>{song.title}</strong><small>{song.artist}</small></span><em>{formatTime(song.duration || 0)}</em></button>)}{!sidebarSongs.length && <p className={styles.queueEmpty}>No liked songs found.</p>}</div>
        </div>
      </aside>
    </main>
  );
}
