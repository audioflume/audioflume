"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { MusicLibraryEmptyState } from "@filmwave/shared";
import Footer from "@/components/Footer";
import PlaylistCardShell from "@/components/playlists/PlaylistCardShell";
import playlistCardStyles from "@/components/curated/CuratedPlaylistCard.module.css";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import PlaybackStateIcon from "@/components/icons/PlaybackStateIcon";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import { usePlayer } from "@/context/PlayerContext";
import CardMiniPlayer from "@/components/playlists/CardMiniPlayer";
import CardPlayingWaveform, { cardWaveformStyles } from "@/components/playlists/CardPlayingWaveform";
import type { Song } from "@/lib/types";
import "@/components/curated/curated-browse-filters.css";
import styles from "./page.module.css";

type DirectoryArtist = {
  id: string;
  name: string;
  slug: string;
  designation: string | null;
  intro_text: string | null;
  profile_image_url: string | null;
  hero_image_url: string | null;
  hero_image_position_x: number;
  hero_image_position_y: number;
  genres: string[];
  track_count: number;
  songs: Song[];
};

const PREVIEW_CARD_COUNT = 8;

function ArtistPreviewCard() {
  return (
    <div className={playlistCardStyles.shell}>
      <PlaylistCardShell
        className={`${playlistCardStyles.card} ${styles.artistCard}`}
        squareMedia
        mediaClassName={styles.artistMedia}
        media={<span className={styles.previewImage} aria-hidden="true" />}
        overlays={null}
        details={
          <div className={styles.artistDetails}>
            <div className={playlistCardStyles.copy}>
              <h3>Artist preview</h3>
              <p>Layout placeholder</p>
            </div>

          </div>
        }
      />
    </div>
  );
}

function ArtistCard({
  artist,
  index,
  openArtistId,
  onOpen,
}: {
  artist: DirectoryArtist;
  index: number;
  openArtistId: string | null;
  onOpen: (artistId: string) => void;
}) {
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const image = artist.hero_image_url || artist.profile_image_url;
  const playable = artist.songs.filter((song) => Boolean(song.audioUrl));
  const hasActiveSong = playable.some((song) => song.id === currentSong?.id);
  const previewOpen = openArtistId === artist.id;
  const href = `/artists/${artist.slug}`;

  function playSong(song: Song) {
    setQueue(playable);
    togglePlayPause(song);
  }

  return (
    <div className={playlistCardStyles.shell}>
      <PlaylistCardShell
        href={href}
        ariaLabel={`Explore ${artist.name}`}
        className={`${playlistCardStyles.card} ${styles.artistCard} ${cardWaveformStyles.cardHost}${hasActiveSong ? ` ${styles.artistCardActive}` : ""}${previewOpen ? ` ${cardWaveformStyles.cardPreviewOpen}` : ""}`}
        squareMedia
        mediaClassName={styles.artistMedia}
        media={
          image ? (
            <img
              className={playlistCardStyles.media}
              src={image}
              alt=""
              loading={index < 4 ? "eager" : "lazy"}
              style={{ objectPosition: `${artist.hero_image_position_x}% ${artist.hero_image_position_y}%` }}
            />
          ) : (
            <span className={styles.artistFallback} aria-hidden="true">{artist.name.slice(0, 1)}</span>
          )
        }
        overlays={
          <>
            <button
              type="button"
              className={cardWaveformStyles.cardPlayButton}
              disabled={previewOpen}
              aria-label={`Open song preview for ${artist.name}`}
              onClick={(event) => {
                event.stopPropagation();
                onOpen(artist.id);
                if (playable.length) {
                  if (!hasActiveSong) {
                    playSong(playable[0]);
                  }
                } else if (isPlaying && currentSong) {
                  togglePlayPause(currentSong);
                }
              }}
            >
              <PlaybackStateIcon playing={hasActiveSong && isPlaying} size={15} hoverIcon="list" />
            </button>
            {hasActiveSong && isPlaying && !previewOpen ? (
              <CardPlayingWaveform corner label={`${artist.name} is playing`} />
            ) : null}
          </>
        }
        details={
          <Link className={styles.artistDetails} href={href} aria-label={`Explore artist ${artist.name}`}>
            <div className={playlistCardStyles.copy}>
              <h3 className={styles.artistName}>{artist.name}</h3>
              {artist.designation ? <p>{artist.designation}</p> : null}
            </div>
            <span className={styles.artistExplore}>
              <span className={styles.artistExploreText}>Explore artist</span>
              <ArrowUpRightIcon size={17} strokeWidth={1.5} />
            </span>
          </Link>
        }
      />
    </div>
  );
}

export default function Artist2Page() {
  const [artists, setArtists] = useState<DirectoryArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [openArtistId, setOpenArtistId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const { currentSong, isPlaying, setQueue, togglePlayPause, seekTo } = usePlayer();

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);
  useEffect(() => {
    const controller = new AbortController();

    async function loadArtists() {
      try {
        const response = await fetch("/api/artists/directory", { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Unable to load artists");
        setArtists(Array.isArray(data?.artists) ? data.artists : []);
      } catch (cause) {
        if (controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "Unable to load artists");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadArtists();
    return () => controller.abort();
  }, []);

  const visibleArtists = useMemo(() => {
    const term = query.trim().toLocaleLowerCase();
    if (!term) return artists;
    return artists.filter((artist) =>
      [artist.name, artist.designation ?? "", artist.intro_text ?? "", ...artist.genres]
        .some((value) => value.toLocaleLowerCase().includes(term))
    );
  }, [artists, query]);
  const showPreviews = !query.trim();
  const selectedArtist = artists.find((artist) => artist.id === openArtistId);
  const selectedSongs = selectedArtist?.songs.filter((song) => Boolean(song.audioUrl)) ?? [];

  function playSelectedSong(song: Song) {
    setQueue(selectedSongs);
    togglePlayPause(song);
  }
  const cards = [
    ...visibleArtists.map((artist) => ({ kind: "artist" as const, artist })),
    ...(showPreviews
      ? Array.from({ length: PREVIEW_CARD_COUNT }, (_, index) => ({ kind: "preview" as const, index }))
      : []),
  ];

  return (
    <main className={`${styles.page} artist2-page-root`}>
      <div className={styles.searchbarBackground}>
        <GlobalSearchBar musicFieldStyle darkSimilarButton />
      </div>
      <div className={styles.content}>
        <header className={styles.artist2Intro}>
          {searchOpen ? (
            <input
              ref={searchRef}
              className={styles.headingSearch}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setQuery("");
                  setSearchOpen(false);
                }
              }}
              placeholder="search by artist, genre, or keyword"
              aria-label="Search by artist, genre, or keyword"
            />
          ) : (
            <h1>Human made music &amp; SFX for film.</h1>
          )}
          <div className={styles.introMeta}>
            <button
              type="button"
              className={styles.searchLink}
              onClick={() => setSearchOpen(true)}
              aria-label="Search artists"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="11" cy="11" r="6.5" />
                <path d="m16 16 4.5 4.5" />
              </svg>
              <span>Search</span>
            </button>
            <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore.</p>
          </div>
        </header>
        {loading ? (
          <div className={styles.grid} aria-label="Loading artists">
            {Array.from({ length: 9 }, (_, index) => (
              <div className={styles.skeletonCard} key={index}>
                <div className={styles.skeleton} />
                <div className={styles.skeletonTitle} />
                <div className={styles.skeletonSubtitle} />
              </div>
            ))}
          </div>
        ) : error ? (
          <p className={styles.message} role="alert">{error}</p>
        ) : visibleArtists.length === 0 ? (
          <MusicLibraryEmptyState
            title="No artists found"
            description="Clear a filter or search for something different."
          />
        ) : (
          <section className={styles.grid} aria-label="Artists">
            {cards.map((card, index) => (
              card.kind === "artist" ? (
                <ArtistCard
                  key={card.artist.id}
                  artist={card.artist}
                  index={index}
                  openArtistId={openArtistId}
                  onOpen={setOpenArtistId}
                />
              ) : (
                <ArtistPreviewCard key={`preview-${card.index}`} />
              )
            ))}
          </section>
        )}
      </div>
      {selectedArtist ? (
        <aside className={styles.artistSidebar} aria-label={`Preview music by ${selectedArtist.name}`}>
          <div className={styles.artistSidebarPlayer}>
            <CardMiniPlayer
              key={selectedArtist.id}
              artistName={selectedArtist.name}
              trackCount={selectedArtist.track_count}
              songs={selectedSongs}
              currentSongId={currentSong?.id}
              isPlaying={isPlaying}
              onPlay={playSelectedSong}
              onSeek={(song, progress) => seekTo(song, progress, Boolean(isPlaying && currentSong?.id === song.id))}
              onClose={() => setOpenArtistId(null)}
            />
          </div>
        </aside>
      ) : null}
      <Footer showTopBorder={false} />
    </main>
  );
}
