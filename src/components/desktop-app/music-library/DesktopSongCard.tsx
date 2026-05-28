import { useEffect, useRef, useState } from "react";
import DownloadIconSmall from "../../icons/DownloadIconSmall";
import HeartIcon from "../../icons/HeartIcon";
import MoreIcon from "../../icons/MoreIcon";
import type { DesktopMusicSong } from "./musicLibraryTypes";

export default function DesktopSongCard({
  song,
  favorite,
  markersVisible,
  onFavoriteToggle,
}: {
  song: DesktopMusicSong;
  favorite: boolean;
  markersVisible: boolean;
  onFavoriteToggle: () => void;
}) {
  const [actionsOpen, setActionsOpen] = useState(false);
  const actionsRef = useRef<HTMLDivElement | null>(null);
  const visibleGenres = [song.genre, song.mood].filter(Boolean).join(", ");

  useEffect(() => {
    if (!actionsOpen) return;

    function onPointerDown(event: MouseEvent) {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setActionsOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActionsOpen(false);
    }

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [actionsOpen]);

  return (
    <article className="desktop-song-card">
      <button type="button" className="desktop-song-cover" aria-label="Play song">
        <span className="desktop-song-cover-text">
          {song.title.slice(0, 1).toUpperCase()}
        </span>
        <span className="desktop-song-play-overlay" aria-hidden="true">
          <PlayIcon />
        </span>
      </button>

      <div className="desktop-song-info">
        <h3>{song.title}</h3>
        <p>{song.artist}</p>
      </div>

      <div className="desktop-song-wave-wrap">
        <div className="desktop-song-stems-slot">
          {song.markers > 0 && <span>+{song.markers}</span>}
        </div>

        <div className="desktop-song-wave" aria-hidden="true">
          {song.waveform.map((height, index) => (
            <span
              key={`${song.id}-${index}`}
              style={{ height: `${Math.max(12, height)}%` }}
            />
          ))}
          {markersVisible && <i style={{ left: "34%" }} />}
          {markersVisible && <i style={{ left: "68%" }} />}
        </div>

        <span className="desktop-song-duration">{song.duration}</span>
      </div>

      <div className="desktop-song-genre-slot">
        <span>{visibleGenres}</span>
      </div>

      <div className="desktop-song-key-bpm">
        <span>{song.key || "—"}</span>
        <span>{song.bpm ? `${song.bpm} BPM` : "—"}</span>
      </div>

      <div className="desktop-song-actions" ref={actionsRef}>
        <button
          type="button"
          onClick={onFavoriteToggle}
          aria-label={favorite ? "Remove song from favorites" : "Favorite song"}
          className={favorite ? "is-active" : ""}
        >
          <HeartIcon size={14} filled={favorite} />
        </button>

        <div className="desktop-song-action-menu-wrap">
          <button
            type="button"
            aria-label="Song options"
            aria-expanded={actionsOpen}
            className={actionsOpen ? "is-active" : ""}
            onClick={(event) => {
              event.stopPropagation();
              setActionsOpen((open) => !open);
            }}
          >
            <MoreIcon size={14} />
          </button>

          {actionsOpen && (
            <div className="desktop-song-action-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => setActionsOpen(false)}>
                Add to Playlist
              </button>
              <button type="button" role="menuitem" onClick={() => setActionsOpen(false)}>
                Add to Project
              </button>
              <button type="button" role="menuitem" onClick={() => setActionsOpen(false)}>
                Create New Playlist
              </button>
              <button type="button" role="menuitem" disabled>
                Share Song
              </button>
              <button type="button" role="menuitem" disabled>
                Download Song
              </button>
            </div>
          )}
        </div>

        <button type="button" aria-label="Download song">
          <DownloadIconSmall size={12} />
        </button>
      </div>
    </article>
  );
}

function PlayIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M5 3.5L12 8L5 12.5V3.5Z" fill="currentColor" />
    </svg>
  );
}
