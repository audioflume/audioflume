"use client";

import type { CSSProperties, ReactNode, Ref } from "react";

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
  expandedContent?: ReactNode;
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
  expandedContent,
  onCoverClick,
  onInfoClick,
}: SongCardShellProps) {
  const rootClassName = `filmwave-song-card${expandedContent ? " has-expanded-content" : ""}${className ? ` ${className}` : ""}`;
  const baseStyle = {
    "--filmwave-song-card-cover-size": "48px",
    "--filmwave-song-card-min-height": "72px",
  } as CSSProperties;
  const expandedStyle: CSSProperties | undefined = expandedContent
    ? {
        ...baseStyle,
        borderTop: 0,
        borderRight: 0,
        borderBottom: 0,
        borderLeft: 0,
        paddingBottom: "calc(var(--filmwave-song-card-padding-y) - 4px)",
      }
    : baseStyle;

  return (
    <article
      ref={cardRef}
      data-song-card-id={dataSongCardId}
      className={rootClassName}
      style={expandedStyle}
    >
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

      <button
        type="button"
        className="filmwave-song-info"
        onClick={onInfoClick}
      >
        <span className="filmwave-song-title">{title}</span>
        <span className="filmwave-song-artist">{artist}</span>
      </button>

      {waveform && (
        <div className="filmwave-song-wave-wrap">
          <div className="filmwave-song-stems-slot">{stems}</div>
          <div className="filmwave-song-wave">{waveform}</div>
          {duration && (
            <span className="filmwave-song-duration">{duration}</span>
          )}
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

      <div className="filmwave-song-compact-tail">
        {duration && (
          <span className="filmwave-song-duration filmwave-song-compact-duration">
            {duration}
          </span>
        )}
        <div className="filmwave-song-actions">{actions}</div>
      </div>

      {expandedContent && (
        <div className="filmwave-song-expanded-content">{expandedContent}</div>
      )}
    </article>
  );
}
