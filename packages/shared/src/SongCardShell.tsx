"use client";

import type { ReactNode, Ref } from "react";

type SongCardShellProps = {
  cardRef?: Ref<HTMLElement>;
  className?: string;
  dataSongCardId?: string;
  cover: ReactNode;
  coverLabel: string;
  playOverlay: ReactNode;
  title: ReactNode;
  artist: ReactNode;
  stems?: ReactNode;
  waveform?: ReactNode;
  duration?: ReactNode;
  genre?: ReactNode;
  keyMeta?: ReactNode;
  bpmMeta?: ReactNode;
  actions: ReactNode;
  onCoverClick?: () => void;
  onInfoClick?: () => void;
};

export function SongCardShell({
  cardRef,
  className = "",
  dataSongCardId,
  cover,
  coverLabel,
  playOverlay,
  title,
  artist,
  stems,
  waveform,
  duration,
  genre,
  keyMeta,
  bpmMeta,
  actions,
  onCoverClick,
  onInfoClick,
}: SongCardShellProps) {
  const rootClassName = `filmwave-song-card${className ? ` ${className}` : ""}`;

  return (
    <article ref={cardRef} data-song-card-id={dataSongCardId} className={rootClassName}>
      <button
        type="button"
        className="filmwave-song-cover"
        aria-label={coverLabel}
        onClick={onCoverClick}
      >
        {cover}
        <span className="filmwave-song-play-overlay" aria-hidden="true">
          <span className="filmwave-song-play-button">{playOverlay}</span>
        </span>
      </button>

      <button type="button" className="filmwave-song-info" onClick={onInfoClick}>
        <span className="filmwave-song-title">{title}</span>
        <span className="filmwave-song-artist">{artist}</span>
      </button>

      {waveform && (
        <div className="filmwave-song-wave-wrap">
          <div className="filmwave-song-stems-slot">{stems}</div>
          <div className="filmwave-song-wave">{waveform}</div>
          {duration && <span className="filmwave-song-duration">{duration}</span>}
        </div>
      )}

      {genre && (
        <div className="filmwave-song-genre-slot">
          <span className="filmwave-song-genre">{genre}</span>
        </div>
      )}

      {(keyMeta || bpmMeta) && (
        <div className="filmwave-song-key-bpm filmwave-song-meta">
          {keyMeta && <span className="filmwave-song-key">{keyMeta}</span>}
          {bpmMeta && <span className="filmwave-song-bpm">{bpmMeta}</span>}
        </div>
      )}

      {!waveform && duration ? (
        <div className="filmwave-song-compact-tail">
          <span className="filmwave-song-duration">{duration}</span>
          <div className="filmwave-song-actions">{actions}</div>
        </div>
      ) : (
        <div className="filmwave-song-actions">{actions}</div>
      )}
    </article>
  );
}
