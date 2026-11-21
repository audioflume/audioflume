"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { MusicLibraryEmptyState } from "@filmwave/shared";
import Footer from "@/components/Footer";
import PlaylistCardShell from "@/components/playlists/PlaylistCardShell";
import playlistCardStyles from "@/components/curated/CuratedPlaylistCard.module.css";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";
import PlaybackStateIcon from "@/components/icons/PlaybackStateIcon";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
import XIcon from "@/components/icons/XIcon";
import { usePlayer } from "@/context/PlayerContext";
import CardMiniPlayer from "@/components/playlists/CardMiniPlayer";
import CardPlayingWaveform, { cardWaveformStyles } from "@/components/playlists/CardPlayingWaveform";
import type { Song } from "@/lib/types";
import "@/components/curated/curated-browse-filters.css";
import styles from "./page.module.css";
import "../home-page.css";

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
  onClose,
}: {
  artist: DirectoryArtist;
  index: number;
  openArtistId: string | null;
  onOpen: (artistId: string) => void;
  onClose: () => void;
}) {
  const { currentSong, isPlaying, setQueue, togglePlayPause, seekTo } = usePlayer();
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
                if (!hasActiveSong && isPlaying && currentSong) {
                  togglePlayPause(currentSong);
                }
              }}
            >
              <PlaybackStateIcon playing={hasActiveSong && isPlaying} size={15} hoverIcon="list" />
            </button>
            {hasActiveSong && isPlaying && !previewOpen ? (
              <CardPlayingWaveform corner label={`${artist.name} is playing`} />
            ) : null}
            {previewOpen ? (
              <CardMiniPlayer
                artistName={artist.name}
                trackCount={artist.track_count}
                songs={playable}
                currentSongId={currentSong?.id}
                isPlaying={isPlaying}
                onPlay={playSong}
                onSeek={(song, progress) => seekTo(song, progress, Boolean(isPlaying && currentSong?.id === song.id))}
                onClose={onClose}
              />
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
              <ArrowUpRightIcon size={17} strokeWidth={1.5} />
            </span>
          </Link>
        }
      />
    </div>
  );
}

export default function ArtistsPage() {
  const [artists, setArtists] = useState<DirectoryArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [openArtistId, setOpenArtistId] = useState<string | null>(null);
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
    const search = query.trim().toLocaleLowerCase();
    return artists.filter((artist) => {
      if (!search) return true;
      return [artist.name, artist.designation ?? "", artist.intro_text ?? "", ...artist.genres]
        .some((text) => text.toLocaleLowerCase().includes(search));
    });
  }, [artists, query]);

  const showPreviews = !query.trim();
  const cards = [
    ...visibleArtists.map((artist) => ({ kind: "artist" as const, artist })),
    ...(showPreviews
      ? Array.from({ length: PREVIEW_CARD_COUNT }, (_, index) => ({ kind: "preview" as const, index }))
      : []),
  ];

  return (
    <main className={`${styles.page} artists-page-root`}>
      <div className="audioflume-experiment-search">
        <div
          className="audioflume-experiment-search-row"
          onClick={(event) => {
            if (
              event.target instanceof Element &&
              event.target.closest(".audioflume-experiment-search-field") &&
              !event.target.closest("button")
            ) {
              event.currentTarget.querySelector<HTMLInputElement>(".audioflume-experiment-search-field input")?.focus();
            }
          }}
        >
          <Link className="audioflume-experiment-search-filter" href="/music?filters=open">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4v16M12 4v16M19 4v16M2 8h6M9 15h6M16 10h6" /></svg>
            <span>Filters</span>
          </Link>
          <label className="audioflume-experiment-search-field">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m16 16 4.5 4.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search artists by name, genre or keyword"
              aria-label="Search artists by name, genre or keyword"
            />
            {query.length > 0 ? (
              <button type="button" className="audioflume-experiment-search-clear" onClick={() => setQuery("")} aria-label="Clear search">
                <XIcon size={8} strokeWidth={1.4} />
              </button>
            ) : null}
          </label>
          <GlobalReferenceSearch className="audioflume-experiment-search-similar" />
        </div>
      </div>
      <div className={styles.content}>
        <header className={styles.directoryIntro}>
          <h1>Discover the artists behind the sound.</h1>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore.</p>
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
                  onClose={() => setOpenArtistId(null)}
                />
              ) : (
                <ArtistPreviewCard key={`preview-${card.index}`} />
              )
            ))}
          </section>
        )}
      </div>
      <Footer showTopBorder={false} />
    </main>
  );
}
