"use client";

import Link from "next/link";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import GlobalMusicSearchField from "@/components/GlobalMusicSearchField";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";
import { AudioflumeMark } from "@/components/LifetimeAccessCard";
import { useSongs } from "@/hooks/useSongs";
import { usePlayer } from "@/context/PlayerContext";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import PauseIcon from "@/components/icons/PauseIcon";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

export default function HomeSearchPreview() {
  const router = useRouter();
  const { songs } = useSongs();
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [artists, setArtists] = useState<Array<{ id: string; name: string; slug: string; hero_image_url?: string | null; profile_image_url?: string | null }>>([]);
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return songs.filter((song) =>
      Boolean(song.audioUrl) &&
      [song.title, song.artist, ...(song.genres ?? []), ...(song.moods ?? []), ...(song.instruments ?? [])]
        .some((value) => String(value ?? "").toLowerCase().includes(term))
    ).slice(0, 5);
  }, [query, songs]);

  const matchedArtist = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;
    return artists.find((artist) => artist.name.toLowerCase().includes(term))
      ?? artists.find((artist) => matches.some((song) => song.artist.toLowerCase() === artist.name.toLowerCase()))
      ?? null;
  }, [artists, matches, query]);
  const matchedPlaylist = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return null;
    return playlists.find((playlist) =>
      [playlist.name, playlist.kicker, playlist.description, ...playlist.browse_tags, ...playlist.browse_subcategories]
        .some((value) => String(value || "").toLowerCase().includes(term))) ?? null;
  }, [playlists, query]);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch("/api/home-featured-artists").then((response) => response.ok ? response.json() : null).catch(() => null),
      fetch("/api/curated-playlists").then((response) => response.ok ? response.json() : null).catch(() => null),
    ]).then(([artistData, playlistData]) => {
      if (!active) return;
      if (Array.isArray(artistData?.artists)) setArtists(artistData.artists);
      if (Array.isArray(playlistData)) setPlaylists(playlistData);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="audioflume-home-landing-search-preview-anchor" ref={containerRef}>
      <div className="audioflume-home-landing-search">
        <div className="audioflume-home-landing-search-field">
          <Link href="/discover" className="audioflume-home-landing-search-brand" aria-label="Explore Discover">
            <AudioflumeMark ariaHidden className="audioflume-home-landing-search-mark" />
          </Link>
          <GlobalMusicSearchField
            value={query}
            onChange={(value) => { setQuery(value); setOpen(Boolean(value.trim())); }}
            onClear={() => { setQuery(""); setOpen(false); }}
            showSubmitArrow
            onSubmit={(event) => {
              event.preventDefault();
              setOpen(false);
              const term = query.trim();
              router.push(term ? `/music?search=${encodeURIComponent(term)}` : "/music");
            }}
          />
        </div>
        <GlobalReferenceSearch className="audioflume-home-landing-search-song" />
      </div>
      {open && query.trim() && (
        <div className="audioflume-home-landing-search-preview" role="region" aria-label="Search previews">
          <div className="audioflume-home-landing-search-preview-columns">
            <div className="audioflume-home-landing-search-preview-discovery">
              {matchedArtist && (
                <Link href={`/artists/${matchedArtist.slug}`} className="audioflume-home-landing-search-preview-feature" onClick={() => setOpen(false)}>
                  <span className="audioflume-home-landing-search-preview-feature-image">
                    {(matchedArtist.hero_image_url || matchedArtist.profile_image_url) && <img src={matchedArtist.hero_image_url || matchedArtist.profile_image_url || ""} alt="" loading="lazy" />}
                  </span>
                  <span className="audioflume-home-landing-search-preview-feature-copy"><small>ARTIST</small><strong>{matchedArtist.name}</strong></span>
                </Link>
              )}
              {matchedPlaylist && (
                <Link href={`/curated-playlists/${matchedPlaylist.id}`} className="audioflume-home-landing-search-preview-playlist" onClick={() => setOpen(false)}>
                  {matchedPlaylist.cover_image_url && <img src={matchedPlaylist.cover_image_url} alt="" loading="lazy" />}
                  <span><small>PLAYLIST</small><strong>{matchedPlaylist.name}</strong></span>
                </Link>
              )}
              {!matchedArtist && !matchedPlaylist && <p className="audioflume-home-landing-search-preview-empty">No matching artists or playlists.</p>}
            </div>
            <div className="audioflume-home-landing-search-preview-songs">
              {matches.length ? matches.map((song) => {
            const playing = currentSong?.id === song.id && isPlaying;
            return (
              <button type="button" className="audioflume-home-landing-search-preview-row" key={song.id}
                onClick={() => { setQueue(matches); togglePlayPause(song); }}
                aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}>
                <span className="audioflume-home-landing-search-preview-artwork">
                  {song.coverArt ? <img src={song.coverArt} alt="" loading="lazy" /> : <span className="audioflume-home-landing-search-preview-art" />}
                  <span className="audioflume-home-landing-search-preview-play" aria-hidden="true">
                    {playing ? <PauseIcon size={18} /> : <PlayIconSmall size={18} />}
                  </span>
                </span>
                <span className="audioflume-home-landing-search-preview-info">
                  <span className="audioflume-home-landing-search-preview-name">{song.title}</span>
                  <span className="audioflume-home-landing-search-preview-artist">{song.artist}</span>
                </span>
              </button>
            );
          }) : <p className="audioflume-home-landing-search-preview-empty">No matching songs found.</p>}
            </div>
          </div>
          <button type="button" className="audioflume-home-landing-search-preview-more" onClick={() => {
            setOpen(false);
            router.push(`/music?search=${encodeURIComponent(query.trim())}`);
          }}>View all search results ↗</button>
        </div>
      )}
    </div>
  );
}
