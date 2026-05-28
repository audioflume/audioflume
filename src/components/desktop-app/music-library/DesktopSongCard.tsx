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
  const visibleGenres = [song.genre, song.mood].filter(Boolean).join(", ");

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

      <div className="desktop-song-actions">
        <button
          type="button"
          onClick={onFavoriteToggle}
          aria-label={favorite ? "Remove song from favorites" : "Favorite song"}
          className={favorite ? "is-active" : ""}
        >
          <HeartIcon size={14} filled={favorite} />
        </button>

        <button type="button" aria-label="More song actions">
          <MoreIcon size={14} />
        </button>

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
