"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import CardMiniPlayer from "@/components/playlists/CardMiniPlayer";
import PlaybackStateIcon from "@/components/icons/PlaybackStateIcon";
import { usePlayer } from "@/context/PlayerContext";
import type { Song } from "@/lib/types";

type DirectoryArtist = {
  id: string;
  name: string;
  slug: string;
  designation: string | null;
  hero_image_url: string | null;
  profile_image_url: string | null;
  hero_image_position_x: number;
  hero_image_position_y: number;
  track_count: number;
  songs: Song[];
};

const PLACEHOLDER_ARTIST: DirectoryArtist = {
  id: "discover2-artist-placeholder",
  name: "Artist preview",
  slug: "",
  designation: "Coming soon",
  hero_image_url: null,
  profile_image_url: null,
  hero_image_position_x: 50,
  hero_image_position_y: 50,
  track_count: 0,
  songs: [],
};

export default function Discover2WatchingArtists() {
  const [artists, setArtists] = useState<DirectoryArtist[]>([]);
  const [selected, setSelected] = useState(0);
  const [previewArtistId, setPreviewArtistId] = useState<string | null>(null);
  const horizontalScroll = useRef({ distance: 0, lastEvent: 0, handledScroll: false });
  const { currentSong, isPlaying, setQueue, togglePlayPause, seekTo } = usePlayer();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/artists/directory", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load artists");
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) setArtists([...(Array.isArray(data?.artists) ? data.artists.slice(0, 5) : []), PLACEHOLDER_ARTIST]);
      })
      .catch(() => {
        if (!controller.signal.aborted) setArtists([]);
      });
    return () => controller.abort();
  }, []);

  function openArtist(artist: DirectoryArtist) {
    const playable = artist.songs.filter((song) => Boolean(song.audioUrl));
    if (playable.length === 0) return;
    setSelected(artists.findIndex((item) => item.id === artist.id));
    setPreviewArtistId(artist.id);
    // Opening the preview does not start playback; controls inside the mini-player do.
  }

  function closePreview() {
    if (previewArtistId && isPlaying && artists.find((artist) => artist.id === previewArtistId)?.songs.some((song) => song.id === currentSong?.id) && currentSong) {
      togglePlayPause(currentSong);
    }
    setPreviewArtistId(null);
  }

  function handleHorizontalScroll(event: React.WheelEvent<HTMLDivElement>) {
    if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || artists.length < 2) return;

    const now = performance.now();
    const scroll = horizontalScroll.current;
    // Treat a continuous stream of wheel events (including momentum) as one scroll action.
    if (now - scroll.lastEvent > 110) {
      scroll.distance = 0;
      scroll.handledScroll = false;
    }
    scroll.lastEvent = now;
    if (scroll.handledScroll) return;

    // Accumulate actual horizontal scroll distance instead of interpreting velocity spikes as swipes.
    const pixels = event.deltaX * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? event.currentTarget.clientWidth : 1);
    scroll.distance += pixels;
    if (Math.abs(scroll.distance) < 40) return;

    const direction = Math.sign(scroll.distance);
    scroll.handledScroll = true;
    const next = Math.max(0, Math.min(artists.length - 1, selected + direction));
    if (next !== selected) {
      closePreview();
      setSelected(next);
    }
  }

  return (
    <section className="discover2-watching" aria-label="Artists we're watching">
      <h2>
        <Link className="discover2-watching-heading-link" href="/artist2" aria-label="Explore artists">
          <span className="discover2-watching-heading-default" aria-hidden="true">Artists we’re watching</span>
          <span className="discover2-watching-heading-hover" aria-hidden="true">
            Explore artists
            <svg className="discover2-watching-heading-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
              <path d="M4 21 19 5M5 5h14v14" />
            </svg>
          </span>
        </Link>
      </h2>
      <div className="discover2-watching-accordion" onWheel={handleHorizontalScroll}>
        {artists.map((artist, index) => {
          const placeholder = artist.id === PLACEHOLDER_ARTIST.id;
          const active = index === selected;
          const previewOpen = artist.id === previewArtistId;
          const playable = artist.songs.filter((song) => Boolean(song.audioUrl));
          const hasActiveSong = playable.some((song) => song.id === currentSong?.id);
          const image = artist.hero_image_url || artist.profile_image_url;
          return (
            <article
              key={artist.id}
              className={`discover2-watching-card${active ? " is-selected" : ""}${previewOpen ? " is-preview-open" : ""}`}
              onClick={() => {
                if (!active) {
                  closePreview();
                  setSelected(index);
                }
              }}
            >
              {image ? (
                <img
                  className="discover2-watching-image"
                  src={image}
                  alt=""
                  loading={index < 2 ? "eager" : "lazy"}
                  style={{ objectPosition: `${artist.hero_image_position_x ?? 50}% ${artist.hero_image_position_y ?? 50}%` }}
                />
              ) : <div className="discover2-watching-image-fallback" />}
              {!previewOpen ? (
                <>
                  {!active ? (
                    <button className="discover2-watching-select" type="button" aria-label={`Show ${artist.name}`} onClick={() => setSelected(index)} />
                  ) : (
                    <>
                      {!placeholder ? <Link className="discover2-watching-explore" href={`/artists/${artist.slug}`}>Explore artist ↗</Link> : null}
                      <div className="discover2-watching-description">
                        {placeholder ? <span className="discover2-watching-name">{artist.name}</span> : <Link href={`/artists/${artist.slug}`} className="discover2-watching-name">{artist.name}</Link>}
                        <span>{artist.designation || "Artist / Composer"}</span>
                      </div>
                      {!placeholder ? (
                      <button
                        className="discover2-watching-play"
                        type="button"
                        aria-label={`Play music by ${artist.name}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          openArtist(artist);
                        }}
                      >
                        <PlaybackStateIcon playing={hasActiveSong && isPlaying} size={15} hoverIcon="list" />
                      </button>
                      ) : null}
                    </>
                  )}
                </>
              ) : (
                <CardMiniPlayer
                  artistName={artist.name}
                  trackCount={artist.track_count}
                  songs={playable}
                  currentSongId={currentSong?.id}
                  isPlaying={isPlaying}
                  onPlay={(song) => {
                    setQueue(playable);
                    togglePlayPause(song);
                  }}
                  onSeek={(song, progress) => seekTo(song, progress, Boolean(isPlaying && currentSong?.id === song.id))}
                  onClose={closePreview}
                />
              )}
            </article>
          );
        })}
      </div>
      <div className="discover2-watching-caption">
        <p>Discover the artists shaping the sound of modern storytelling.</p>
        <span>A HIGHLY CURATED SELECTION OF THE WORLD’S BEST COMPOSERS</span>
      </div>
    </section>
  );
}
