"use client";

import { MusicListShell } from "@filmwave/shared";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

import Footer from "@/components/Footer";
import SongCard from "@/components/SongCard";
import { CuratedPlaylistCard } from "@/components/curated/CuratedPlaylistShelf";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import { useHasCurrentSong, usePlayer } from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";
import type { Song } from "@/lib/types";

const NEW_SONG_COUNT = 10;
const HOME_SHELF_SONG_COUNT = 12;
const HOME_HERO_IMAGE =
  "https://images.filmwave.io/images/discover/3a193bec-27ca-455c-902d-f653897eb37e.png";

type HomeArtist = {
  id: string;
  name: string;
  slug: string;
  designation?: string | null;
  custom_text?: string | null;
  profile_image_url?: string | null;
  hero_image_url?: string | null;
  hero_image_position_x?: number;
  hero_image_position_y?: number;
  songs: Song[];
};

function Shelf({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  function updateScrollState() {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
    setCanScrollPrev(scroller.scrollLeft > 4);
    setCanScrollNext(scroller.scrollLeft < maxScrollLeft - 4);
  }

  function scroll(direction: "prev" | "next") {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const amount = Math.max(scroller.clientWidth * 0.8, 360);
    scroller.scrollBy({
      left: direction === "next" ? amount : -amount,
      behavior: "smooth",
    });
  }

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    updateScrollState();
    scroller.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);

    const observer = new ResizeObserver(updateScrollState);
    observer.observe(scroller);

    return () => {
      scroller.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
      observer.disconnect();
    };
  }, []);

  return (
    <div className={`audioflume-home-reference-shelf group/home-reference-shelf ${className}`}>
      <button
        type="button"
        className="audioflume-home-reference-shelf-arrow is-left"
        onClick={() => scroll("prev")}
        disabled={!canScrollPrev}
        aria-label={`Scroll ${label} left`}
      >
        <ChevronLeftIcon size={18} />
      </button>

      <div ref={scrollerRef} className="audioflume-home-reference-shelf-scroller">
        {children}
      </div>

      <button
        type="button"
        className="audioflume-home-reference-shelf-arrow is-right"
        onClick={() => scroll("next")}
        disabled={!canScrollNext}
        aria-label={`Scroll ${label} right`}
      >
        <ChevronRightIcon size={18} />
      </button>
    </div>
  );
}

function HomeSongShelf({
  songs,
}: {
  songs: Song[];
}) {
  const { currentSong, isPlaying, togglePlayPause } = usePlayer();

  return (
    <Shelf label="featured tracks" className="audioflume-home-reference-song-shelf">
      {songs.map((song) => {
        const playing = Boolean(
          currentSong?.id === song.id && isPlaying,
        );

        return (
          <article key={song.id} className="audioflume-home-reference-song-card">
            <button
              type="button"
              className="audioflume-home-reference-song-card-play"
              onClick={() => togglePlayPause(song)}
              aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
            >
              {song.coverArt ? (
                <img src={song.coverArt} alt="" draggable={false} />
              ) : (
                <span className="audioflume-home-reference-song-card-fallback" />
              )}
              <span className="audioflume-home-reference-song-card-copy">
                <strong>{song.title}</strong>
                <span>{song.artist}</span>
              </span>
              <span className="audioflume-home-reference-song-card-icon">
                {playing ? <PauseIcon size={14} /> : <PlayIconSmall size={14} />}
              </span>
            </button>
          </article>
        );
      })}
    </Shelf>
  );
}

function HomeArtistShelf({
  artists,
}: {
  artists: HomeArtist[];
}) {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();

  function playArtist(event: MouseEvent, artist: HomeArtist) {
    event.preventDefault();
    event.stopPropagation();

    const playable = artist.songs.filter((song) => Boolean(song.audioUrl));
    if (!playable.length) return;

    const artistIsPlaying = Boolean(
      isPlaying &&
        currentSong &&
        playable.some((song) => song.id === currentSong.id),
    );

    if (artistIsPlaying && currentSong) {
      togglePlayPause(currentSong);
      return;
    }

    setQueue(playable);
    togglePlayPause(playable[0]);
  }

  return (
    <Shelf label="in demand artists" className="audioflume-home-reference-artist-shelf">
      {artists.map((artist) => {
        const image = artist.hero_image_url || artist.profile_image_url || "";
        const playable = artist.songs.filter((song) => Boolean(song.audioUrl));
        const genres = Array.from(
          new Set(
            artist.songs.flatMap((song) =>
              Array.isArray(song.genres) ? song.genres.filter(Boolean) : [],
            ),
          ),
        ).slice(0, 3);
        const artistIsPlaying = Boolean(
          isPlaying &&
            currentSong &&
            playable.some((song) => song.id === currentSong.id),
        );

        return (
          <article key={artist.id} className="audioflume-home-reference-artist-card">
            <Link href={`/artists/${artist.slug}`} className="audioflume-home-reference-artist-link">
              <div className="audioflume-home-reference-artist-media">
                {image ? (
                  <img
                    src={image}
                    alt=""
                    draggable={false}
                    style={{
                      objectPosition: `${artist.hero_image_position_x ?? 50}% ${artist.hero_image_position_y ?? 50}%`,
                    }}
                  />
                ) : null}
              </div>
              <div className="audioflume-home-reference-artist-bar">
                <span className="audioflume-home-reference-artist-thumb">
                  {artist.profile_image_url ? (
                    <img src={artist.profile_image_url} alt="" draggable={false} />
                  ) : image ? (
                    <img src={image} alt="" draggable={false} />
                  ) : null}
                </span>
                <span className="audioflume-home-reference-artist-copy">
                  <small>Featured Artist</small>
                  <strong>{artist.name}</strong>
                  {genres.length > 0 ? (
                    <span className="audioflume-home-reference-artist-genres">
                      {genres.map((genre) => (
                        <span key={genre}>{genre}</span>
                      ))}
                    </span>
                  ) : null}
                </span>
              </div>
            </Link>
            <button
              type="button"
              className="audioflume-home-reference-artist-play"
              onClick={(event) => playArtist(event, artist)}
              disabled={!playable.length}
              aria-label={artistIsPlaying ? `Pause ${artist.name}` : `Play ${artist.name}`}
            >
              {artistIsPlaying ? <PauseIcon size={14} /> : <PlayIconSmall size={14} />}
            </button>
          </article>
        );
      })}
    </Shelf>
  );
}

function PlaylistGrid({
  playlists,
}: {
  playlists: CuratedPlaylist[];
}) {
  return (
    <div className="audioflume-home-reference-playlist-grid">
      {playlists.slice(0, 6).map((playlist, index) => (
        <CuratedPlaylistCard
          key={playlist.id}
          playlist={playlist}
          index={index}
        />
      ))}
    </div>
  );
}

export default function HomePageContent() {
  const { songs, loading: songsLoading } = useSongs();
  const { setQueue } = usePlayer();
  const playerVisible = useHasCurrentSong();
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [artists, setArtists] = useState<HomeArtist[]>([]);

  const playableSongs = useMemo(
    () => songs.filter((song) => Boolean(song.audioUrl)),
    [songs],
  );
  const shelfSongs = playableSongs.slice(0, HOME_SHELF_SONG_COUNT);
  const recentSongs = playableSongs.slice(0, NEW_SONG_COUNT);

  useEffect(() => {
    if (!songsLoading) setQueue(playableSongs);
  }, [playableSongs, setQueue, songsLoading]);

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

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch("/api/discover-featured-artists").then((response) => response.json()),
      fetch("/api/discover-feature-card-artists").then((response) => response.json()),
    ])
      .then(([featured, cards]) => {
        if (cancelled) return;

        const combined = [
          ...(Array.isArray(featured?.artists) ? featured.artists : []),
          ...(Array.isArray(cards?.artists) ? cards.artists : []),
        ] as HomeArtist[];

        const unique = Array.from(
          new Map(combined.map((artist) => [artist.id, artist])).values(),
        );

        setArtists(unique);
      })
      .catch(() => {
        if (!cancelled) setArtists([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={`audioflume-home-reference${playerVisible ? " has-player" : ""}`}>
      <section
        className="audioflume-home-reference-hero"
        style={{ backgroundImage: `url("${HOME_HERO_IMAGE}")` }}
      >
        <div className="audioflume-home-reference-hero-shade" />
        <h1>Human made music &amp; SFX for film.</h1>
      </section>

      <section className="audioflume-home-reference-intro">
        <div className="audioflume-home-reference-width audioflume-home-reference-intro-grid">
          <h2>Every track &amp; sound effect built for the edit.</h2>
          <p>
            Human-curated music and SFX built for filmmakers, with a faster path
            from the first search to the final edit.
          </p>
        </div>

        <div className="audioflume-home-reference-width audioflume-home-reference-trust">
          <p>Filmmakers working for these brands already use Audioflume.</p>
          <div className="audioflume-home-reference-logo-row" aria-label="Brand work">
            <span>DJI</span>
            <span>RED BULL</span>
            <span>OAKLEY</span>
            <span>LAMBORGHINI</span>
            <span>NETFLIX</span>
            <span>PORSCHE</span>
            <span className="is-dot">●</span>
            <span>HBO</span>
          </div>
        </div>
      </section>

      {shelfSongs.length > 0 ? <HomeSongShelf songs={shelfSongs} /> : null}

      <section className="audioflume-home-reference-library">
        <div className="audioflume-home-reference-width audioflume-home-reference-library-grid">
          <div className="audioflume-home-reference-library-copy">
            <h2>An extensive library of music curated for film.</h2>
            <p>
              Straightforward access to Audioflume&apos;s curated music and SFX
              catalogue, with plans for solo filmmakers, active studios and
              larger creative teams.
            </p>
          </div>
          <div className="audioflume-home-reference-library-media-slot" aria-hidden="true" />
        </div>
      </section>

      <section className="audioflume-home-reference-artists">
        <div className="audioflume-home-reference-width audioflume-home-reference-section-heading">
          <span>In demand artists &amp; composers</span>
          <Link href="/discover">Explore Artists</Link>
        </div>
        {artists.length > 0 ? <HomeArtistShelf artists={artists} /> : null}
      </section>

      <section className="audioflume-home-reference-features">
        <div className="audioflume-home-reference-width audioflume-home-reference-feature-grid">
          <div>
            <h3>Human made music &amp; SFX.</h3>
            <p>
              Original work created by independent artists and sound designers,
              built around picture, pacing and story.
            </p>
          </div>
          <div>
            <h3>Playlists built around the scene.</h3>
            <p>
              Curated by people who understand how music works against picture,
              so the right track is easier to find.
            </p>
          </div>
          <div>
            <h3>Support real world artists.</h3>
            <p>
              Music comes from real artists and composers, with licensing built
              around sustainable creative work.
            </p>
          </div>
          <div>
            <h3>Subscription, premium &amp; bespoke.</h3>
            <p>
              Flexible licensing for everyday edits, premium catalogue needs and
              custom commissioned work.
            </p>
          </div>
        </div>
      </section>

      <section className="audioflume-home-reference-playlists">
        <div className="audioflume-home-reference-width">
          <div className="audioflume-home-reference-section-heading">
            <span>Curated playlists for editors</span>
            <Link href="/curated-playlists">Explore Playlists</Link>
          </div>
          <PlaylistGrid playlists={playlists} />
        </div>
      </section>

      <section className="audioflume-home-reference-new-songs">
        <div className="audioflume-home-reference-width">
          <div className="audioflume-home-reference-section-heading">
            <span>Newly Added Songs</span>
            <Link href="/music">Explore Music Library</Link>
          </div>

          <MusicListShell title={null}>
            {songsLoading
              ? Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={index}
                    className="audioflume-home-reference-song-row-skeleton"
                    aria-hidden="true"
                  />
                ))
              : recentSongs.map((song) => (
                  <SongCard key={song.id} song={song} showDivider={false} />
                ))}
          </MusicListShell>
        </div>
      </section>

      <Footer className="audioflume-home-reference-footer" />
    </main>
  );
}
