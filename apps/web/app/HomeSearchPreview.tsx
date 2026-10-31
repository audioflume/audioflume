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

export default function HomeSearchPreview() {
  const router = useRouter();
  const { songs } = useSongs();
  const { currentSong, isPlaying, setQueue, togglePlayPause } = usePlayer();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
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
        <div className="audioflume-home-landing-search-preview" role="region" aria-label="Song search previews">
          <div className="audioflume-home-landing-search-preview-title">SONG PREVIEWS</div>
          {matches.length ? matches.map((song) => {
            const playing = currentSong?.id === song.id && isPlaying;
            return (
              <div className="audioflume-home-landing-search-preview-row" key={song.id}>
                {song.coverArt ? <img src={song.coverArt} alt="" loading="lazy" /> : <span className="audioflume-home-landing-search-preview-art" />}
                <div className="audioflume-home-landing-search-preview-info">
                  <span className="audioflume-home-landing-search-preview-name">{song.title}</span>
                  <span className="audioflume-home-landing-search-preview-artist">{song.artist}</span>
                </div>
                <button type="button" onClick={() => { setQueue(matches); togglePlayPause(song); }}
                  aria-label={playing ? `Pause ${song.title}` : `Play ${song.title}`}
                  className="audioflume-home-landing-search-preview-play">
                  {playing ? <PauseIcon size={18} /> : <PlayIconSmall size={18} />}
                </button>
              </div>
            );
          }) : <p className="audioflume-home-landing-search-preview-empty">No matching songs found.</p>}
          <button type="button" className="audioflume-home-landing-search-preview-more" onClick={() => {
            setOpen(false);
            router.push(`/music?search=${encodeURIComponent(query.trim())}`);
          }}>View all search results ↗</button>
        </div>
      )}
    </div>
  );
}
