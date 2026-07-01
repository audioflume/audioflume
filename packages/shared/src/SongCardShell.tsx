"use client";

import type { CSSProperties, ReactNode, Ref } from "react";

type SongCardShellProps = {
  cardRef?: Ref<HTMLElement>;
  className?: string;
  dataSongCardId?: string;
  cover: ReactNode;
  coverLabel: string;
  playOverlay: ReactNode;
  vocalIndicator?: ReactNode;
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
  vocalIndicator,
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
    "--filmwave-song-card-cover-size": "70px",
    "--filmwave-song-card-min-height": "94px",
  } as CSSProperties;
  const expandedStyle: CSSProperties | undefined = expandedContent
    ? {
        ...baseStyle,
        borderTop: 0,
        borderRight: 0,
        borderBottom: 0,
        borderLeft: 0,
        background: "var(--filmwave-song-card-hover-bg)",
        paddingBottom: "calc(var(--filmwave-song-card-padding-y) - 4px)",
      }
    : baseStyle;
  const vocalIndicatorSlotStyle = {
    display: "flex",
    width: 20,
    flex: "0 0 20px",
    alignItems: "center",
    justifyContent: "center",
    color: "#9a9a9a",
    lineHeight: 0,
    marginLeft: -6,
    marginRight: -8,
  } as CSSProperties;

  return (
    <article
      ref={cardRef}
      data-song-card-id={dataSongCardId}
      className={rootClassName}
      style={expandedStyle}
    >
      <style>
        {`.filmwave-song-card .filmwave-song-stems-trigger:hover, .filmwave-song-card .filmwave-song-stems-trigger[aria-expanded="true"] { background: var(--text-primary) !important; color: var(--bg-primary) !important; }`}
      </style>

      {expandedContent && (
        <style>
          {`.filmwave-song-card.has-expanded-content > .filmwave-song-wave-wrap { flex-basis: 0 !important; } .filmwave-song-card.has-expanded-content .filmwave-song-actions { width: var(--filmwave-song-card-actions-width); flex: 0 0 var(--filmwave-song-card-actions-width); } .filmwave-song-card.has-expanded-content .filmwave-song-stem-card { background: var(--filmwave-song-card-hover-bg); }`}
        </style>
      )}

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

      <span className="filmwave-song-vocal-indicator-slot" style={vocalIndicatorSlotStyle}>
        {vocalIndicator}
      </span>

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
