"use client";

import { MusicListShell } from "@filmwave/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

import Footer from "@/components/Footer";
import SongCard from "@/components/SongCard";
import ChevronLeftIcon from "@/components/icons/ChevronLeftIcon";
import ChevronRightIcon from "@/components/icons/ChevronRightIcon";
import PauseIcon from "@/components/icons/PauseIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import XIcon from "@/components/icons/XIcon";
import {
  useHasCurrentSong,
  useIsCurrentSongPlaying,
  usePlayer,
} from "@/context/PlayerContext";
import { useSongs } from "@/hooks/useSongs";
import type { Song } from "@/lib/types";

const NEW_SONG_COUNT = 10;
const HOME_SHELF_SONG_COUNT = 12;
const HOME_HERO_IMAGE =
  "https://images.filmwave.io/images/home/mohammed-kara-3y66ymL7TC8-unsplash%20edited.jpg";
const HOME_UI_GRAPHIC =
  "https://images.filmwave.io/images/home/UI%20Graphic.jpg";

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

function HomeSongCard({ song }: { song: Song }) {
  const { togglePlayPause } = usePlayer();
  const playing = useIsCurrentSongPlaying(song.id);

  return (
    <article className="audioflume-home-reference-song-card">
      <button
        type="button"
        className="audioflume-home-reference-song-card-play"
        onClick={() => togglePlayPause(song)}
        aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
      >
        {song.coverArt ? (
          <>
            <span
              className="audioflume-home-reference-song-card-background"
              style={{ backgroundImage: `url("${song.coverArt}")` }}
              aria-hidden="true"
            />
            <span className="audioflume-home-reference-song-card-art">
              <img src={song.coverArt} alt="" draggable={false} />
              <span className="audioflume-home-reference-song-card-art-icon">
                {playing ? <PauseIcon size={14} /> : <PlayIconSmall size={14} />}
              </span>
            </span>
          </>
        ) : (
          <span className="audioflume-home-reference-song-card-fallback" />
        )}
        <span className="audioflume-home-reference-song-card-copy">
          <strong>{song.title}</strong>
          <span>{song.artist}</span>
        </span>
      </button>
    </article>
  );
}

function HomeSongShelf({
  songs,
  label = "featured tracks",
}: {
  songs: Song[];
  label?: string;
}) {
  return (
    <Shelf label={label} className="audioflume-home-reference-song-shelf">
      {songs.map((song) => (
        <HomeSongCard key={song.id} song={song} />
      ))}
    </Shelf>
  );
}

function HomeOriginalSongCard({ song }: { song: Song }) {
  const { togglePlayPause } = usePlayer();
  const playing = useIsCurrentSongPlaying(song.id);

  return (
    <article className="audioflume-home-reference-original-song-card">
      <button
        type="button"
        className="audioflume-home-reference-original-song-card-play"
        onClick={() => togglePlayPause(song)}
        aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
      >
        {song.coverArt ? (
          <img src={song.coverArt} alt="" draggable={false} />
        ) : (
          <span className="audioflume-home-reference-original-song-card-fallback" />
        )}
        <span className="audioflume-home-reference-original-song-card-copy">
          <strong>{song.title}</strong>
          <span>{song.artist}</span>
        </span>
        <span className="audioflume-home-reference-original-song-card-icon">
          {playing ? <PauseIcon size={14} /> : <PlayIconSmall size={14} />}
        </span>
      </button>
    </article>
  );
}

function HomeOriginalSongGrid({ songs }: { songs: Song[] }) {
  return (
    <div className="audioflume-home-reference-original-song-grid">
      {songs.slice(0, 12).map((song) => (
        <HomeOriginalSongCard key={song.id} song={song} />
      ))}
    </div>
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

export default function HomePageContent() {
  const { songs, loading: songsLoading } = useSongs();
  const { setQueue } = usePlayer();
  const router = useRouter();
  const playerVisible = useHasCurrentSong();
  const [artists, setArtists] = useState<HomeArtist[]>([]);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const [homeSearch, setHomeSearch] = useState("");

  const playableSongs = useMemo(
    () => songs.filter((song) => Boolean(song.audioUrl)),
    [songs],
  );
  const shelfSongs = playableSongs.slice(0, HOME_SHELF_SONG_COUNT);
  const originalSongs = playableSongs.slice(
    HOME_SHELF_SONG_COUNT,
    HOME_SHELF_SONG_COUNT + 12,
  );
  const recentSongs = playableSongs.slice(0, NEW_SONG_COUNT);

  useEffect(() => {
    if (!songsLoading) setQueue(playableSongs);
  }, [playableSongs, setQueue, songsLoading]);

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

  useEffect(() => {
    const searchBar = searchBarRef.current;
    if (!searchBar) return;

    const preventScrollBounce = (event: WheelEvent | TouchEvent) => {
      event.preventDefault();
    };

    searchBar.addEventListener("wheel", preventScrollBounce, { passive: false });
    searchBar.addEventListener("touchmove", preventScrollBounce, { passive: false });

    return () => {
      searchBar.removeEventListener("wheel", preventScrollBounce);
      searchBar.removeEventListener("touchmove", preventScrollBounce);
    };
  }, []);

  function submitHomeSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = homeSearch.trim();
    router.push(query ? `/music?search=${encodeURIComponent(query)}` : "/music");
  }

  return (
    <main className={`audioflume-home-reference${playerVisible ? " has-player" : ""}`}>
      <div className="audioflume-home-reference-searchbar-slot">
        <div
          ref={searchBarRef}
          className="audioflume-home-reference-searchbar"
        >
          <Link href="/music" className="audioflume-home-reference-searchbar-filters">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 4v16M12 4v16M19 4v16M2 8h6M9 15h6M16 10h6" />
            </svg>
            <span>Filters</span>
          </Link>

          <form
            className="audioflume-home-reference-searchbar-field"
            onSubmit={submitHomeSearch}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              type="search"
              value={homeSearch}
              onChange={(event) => setHomeSearch(event.target.value)}
              placeholder="Search by sound, mood, or scene"
              aria-label="Search by sound, mood, or scene"
            />
            {homeSearch.length > 0 ? (
              <button
                type="button"
                className="audioflume-home-reference-searchbar-clear"
                onClick={() => setHomeSearch("")}
                aria-label="Clear search"
              >
                <XIcon size={8} />
              </button>
            ) : null}
          </form>

          <button
            type="button"
            className="audioflume-home-reference-searchbar-song"
            aria-label="Search by song"
          >
            Search by song
          </button>
        </div>
      </div>

      <section
        className="audioflume-home-reference-hero"
        style={{ backgroundImage: `url("${HOME_HERO_IMAGE}")` }}
      >
        <div className="audioflume-home-reference-hero-shade" />
        <h1>Human made music &amp; SFX for film.</h1>

        <div className="audioflume-home-reference-width audioflume-home-reference-hero-trust">
          <p>Filmmakers working for these brands already use Audioflume.</p>
          <div className="audioflume-home-reference-logo-row" aria-label="Brand work">
            <img
              src="https://images.filmwave.io/images/home/logos.png"
              alt="Brands using Audioflume"
              draggable={false}
            />
          </div>
        </div>
      </section>

      <section className="audioflume-home-reference-ui-showcase">
        <img
          src={HOME_UI_GRAPHIC}
          alt="Audioflume music library interface"
          draggable={false}
        />
        <div className="audioflume-home-reference-width audioflume-home-reference-ui-overlay">
          <h2>An extensive library of music curated for film.</h2>
          <Link href="/sign-up">Create Free Account</Link>
        </div>
      </section>

      {shelfSongs.length > 0 ? <HomeSongShelf songs={shelfSongs} /> : null}

      <section className="audioflume-home-reference-library">
        <div className="audioflume-home-reference-width audioflume-home-reference-library-grid">
          <div className="audioflume-home-reference-library-copy">
            <h2>An extensive library of music curated for film.</h2>
          </div>
          <p>
            Straightforward access to Audioflume&apos;s curated music and SFX
            catalogue, with plans for solo filmmakers, active studios and
            larger creative teams.
          </p>
        </div>

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

      <section className="audioflume-home-reference-artists">
        <div className="audioflume-home-reference-width audioflume-home-reference-section-heading">
          <span>In demand artists &amp; composers</span>
          <Link href="/discover">Explore Artists</Link>
        </div>
        {artists.length > 0 ? <HomeArtistShelf artists={artists} /> : null}
      </section>

      <section className="audioflume-home-reference-playlists">
        <div className="audioflume-home-reference-width audioflume-home-reference-section-heading">
          <span>Audioflume originals</span>
          <Link href="/music">Explore Originals</Link>
        </div>
        {(originalSongs.length > 0 ? originalSongs : shelfSongs).length > 0 ? (
          <HomeOriginalSongGrid
            songs={originalSongs.length > 0 ? originalSongs : shelfSongs}
          />
        ) : null}
      </section>

      <section className="audioflume-home-reference-new-songs">
        <div className="audioflume-home-reference-width">
          <div className="audioflume-home-reference-section-heading">
            <span>New songs added daily</span>
            <Link href="/music">Explore New Music</Link>
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
