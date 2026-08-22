import type { CSSProperties } from "react";

import Footer from "@/components/Footer";
import ArtistFeaturePlayControl from "@/components/artists/ArtistFeaturePlayControl";
import PublicArtistMusic from "@/components/artists/PublicArtistMusic";
import type {
  PublicArtistPageData,
  PublicArtistPlaylist,
  PublicArtistProfile,
  PublicArtistRelease,
} from "@/lib/publicArtist";

export type PublicArtistEditableField =
  | "name"
  | "slug"
  | "designation"
  | "intro_text"
  | "bio"
  | "location"
  | "website_url"
  | "instagram_url"
  | "spotify_url"
  | "youtube_url";

type PublicArtistPageViewProps = {
  data: PublicArtistPageData;
  embedded?: boolean;
  editMode?: boolean;
  editArtist?: PublicArtistProfile | null;
  featureImagePreviewUrl?: string | null;
  onEditFieldChange?: (field: PublicArtistEditableField, value: string) => void;
  onFeatureImageChange?: (file: File) => void;
};

function normalizeExternalUrl(value: string | null) {
  if (!value) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function formatReleaseType(type: PublicArtistRelease["release_type"]) {
  if (type === "ep") return "EP";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatReleaseDate(value: string | null) {
  if (!value) return null;
  const match = value.match(/^(\d{4})/);
  return match?.[1] ?? null;
}

function formatTrackCount(count: number) {
  return `${count} track${count === 1 ? "" : "s"}`;
}

function getArtistNameFitSize(
  value: string,
  targetPercent: number,
  minCqw: number,
  maxCqw: number,
) {
  const widthUnits = Array.from(value.trim()).reduce((total, character) => {
    if (character === " ") return total + 0.25;
    if (/[MW]/.test(character)) return total + 0.9;
    if (/[mw]/.test(character)) return total + 0.78;
    if (/[Iil1]/.test(character)) return total + 0.28;
    return total + 0.52;
  }, 0);
  const containerWidthPercent = targetPercent / Math.max(widthUnits, 1);
  const fittedSize = Math.min(
    maxCqw,
    Math.max(minCqw, containerWidthPercent),
  );
  return `${fittedSize.toFixed(3)}cqw`;
}

function InstagramIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="12"
        r="4.2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="17.4" cy="6.7" r="1" fill="currentColor" />
    </svg>
  );
}

function ReleaseCard({ release }: { release: PublicArtistRelease }) {
  const releaseDate = formatReleaseDate(release.release_date);

  return (
    <article className="artist-public-card">
      <div className="artist-public-card-art">
        {release.cover_image_url ? (
          <img src={release.cover_image_url} alt="" />
        ) : (
          <div className="artist-public-card-placeholder" aria-hidden="true" />
        )}
      </div>
      <div className="artist-public-card-copy">
        <h3>{release.title}</h3>
        <p>
          {formatReleaseType(release.release_type)} · {formatTrackCount(release.track_count)}
          {releaseDate ? ` · ${releaseDate}` : ""}
        </p>
      </div>
    </article>
  );
}

function PlaylistCard({ playlist }: { playlist: PublicArtistPlaylist }) {
  return (
    <article className="artist-public-card">
      <div className="artist-public-card-art artist-public-playlist-card-art">
        {playlist.cover_image_url ? (
          <img src={playlist.cover_image_url} alt="" />
        ) : (
          <div className="artist-public-card-placeholder" aria-hidden="true" />
        )}
      </div>
      <div className="artist-public-card-copy">
        <h3>{playlist.name}</h3>
        <p>{formatTrackCount(playlist.track_count)}</p>
        {playlist.description ? (
          <div className="artist-public-card-description">{playlist.description}</div>
        ) : null}
      </div>
    </article>
  );
}

export default function PublicArtistPageView({
  data,
  embedded = false,
  editMode = false,
  editArtist = null,
  featureImagePreviewUrl = null,
  onEditFieldChange,
  onFeatureImageChange,
}: PublicArtistPageViewProps) {
  const { artist, songs, releases, playlists } = data;
  const displayArtist = editMode && editArtist ? editArtist : artist;
  const externalLinks = [
    ["Website", normalizeExternalUrl(displayArtist.website_url)],
    ["Instagram", normalizeExternalUrl(displayArtist.instagram_url)],
    ["Spotify", normalizeExternalUrl(displayArtist.spotify_url)],
    ["YouTube", normalizeExternalUrl(displayArtist.youtube_url)],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  const showProfileMeta =
    editMode || Boolean(displayArtist.location || externalLinks.length > 0);
  const showProfilePanel = editMode || Boolean(displayArtist.bio || showProfileMeta);
  const featureImageUrl = featureImagePreviewUrl || displayArtist.hero_image_url;
  const RootElement = embedded ? "div" : "main";
  const artistNameStyle = {
    "--artist-name-fit-size": getArtistNameFitSize(
      displayArtist.name,
      72,
      3.2,
      8.6,
    ),
    "--artist-name-full-fit-size": getArtistNameFitSize(
      displayArtist.name,
      100,
      3.2,
      25,
    ),
  } as CSSProperties;

  function updateField(field: PublicArtistEditableField, value: string) {
    onEditFieldChange?.(field, value);
  }

  return (
    <>
      <style>{`
        .artist-public-page {
          margin-top: var(--filmwave-header-height);
          min-height: calc(100vh - var(--filmwave-header-height));
          overflow-x: clip;
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: margin-left 0.2s ease;
        }

        .artist-public-page.artist-public-page-embedded {
          margin-top: 0;
          min-height: 0;
        }

        .artist-public-shell {
          padding: 0 var(--filmwave-page-gutter);
        }

        .artist-public-top {
          padding: 0 0 clamp(86px, 6vw, 104px);
          color: var(--text-primary);
        }

        .artist-public-page-editing .artist-public-top {
          padding-bottom: 170px;
        }

        .artist-public-feature-grid {
          position: relative;
          min-height: clamp(560px, 34vw, 660px);
          isolation: isolate;
          container-type: inline-size;
          background: var(--bg-primary);
        }

        .artist-public-type {
          position: absolute;
          bottom: 28px;
          left: 41%;
          z-index: 5;
          width: 15%;
          margin: 0;
          color: #fff;
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: clamp(15px, 1.05vw, 18px);
          font-weight: 300;
          letter-spacing: 0;
          line-height: 1.2;
          text-transform: uppercase;
        }

        .artist-public-intro,
        .artist-public-intro-editor {
          position: absolute;
          bottom: 28px;
          left: 59%;
          z-index: 5;
          width: 32%;
          max-width: 560px;
          margin: 0;
          color: #fff;
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: 16px;
          font-weight: 300;
          letter-spacing: 0;
          line-height: 1.35;
        }

        .artist-public-feature-media {
          position: absolute;
          top: var(--filmwave-page-gutter);
          right: 0;
          bottom: 0;
          z-index: 1;
          width: 62%;
          overflow: hidden;
          background: var(--bg-secondary);
        }

        .artist-public-feature-image,
        .artist-public-feature-fallback {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .artist-public-feature-image {
          display: block;
          object-fit: cover;
        }

        .artist-public-feature-fallback {
          background:
            radial-gradient(circle at 68% 24%, rgba(255,255,255,0.08), transparent 28%),
            linear-gradient(145deg, var(--bg-secondary), var(--bg-tertiary));
        }

        .artist-public-feature-listen {
          position: absolute;
          right: 28px;
          bottom: 28px;
          z-index: 2;
          display: inline-grid;
          grid-template-columns: 52px;
          align-items: center;
          padding: 0;
          border: 0;
          background: transparent;
          color: #fff;
          cursor: pointer;
        }

        .artist-public-feature-listen-label {
          display: none;
        }

        .artist-public-feature-play-badge {
          display: inline-flex;
          width: 52px;
          height: 52px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: #fff;
          color: #111;
          transition: transform 160ms ease;
          transform-origin: center;
        }

        .artist-public-feature-listen:hover .artist-public-feature-play-badge,
        .artist-public-feature-listen:focus-visible .artist-public-feature-play-badge {
          transform: scale(1.03);
        }

        .artist-public-name {
          position: absolute;
          top: calc(clamp(110px, 7.2vw, 138px) + 60px);
          left: 0;
          z-index: 3;
          width: 73%;
          margin: 0;
          color: #fff;
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: clamp(72px, var(--artist-name-fit-size), 150px);
          font-weight: 400;
          letter-spacing: -0.045em;
          line-height: 0.92;
          white-space: nowrap;
          mix-blend-mode: difference;
        }

        .artist-public-left-stack {
          position: absolute;
          bottom: 0;
          left: 0;
          z-index: 4;
          display: flex;
          width: 33.5%;
          flex-direction: column;
          gap: 47px;
        }

        .artist-public-stats {
          display: grid;
          gap: 4px;
          color: var(--text-primary);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-weight: 300;
          letter-spacing: -0.02em;
          line-height: 1;
          text-transform: uppercase;
        }

        .artist-public-stat-row {
          display: grid;
          grid-template-columns: 42px auto;
          align-items: center;
          gap: 12px;
          font-size: clamp(16px, 1.2vw, 20px);
          white-space: nowrap;
        }

        .artist-public-stat-count {
          display: inline-flex;
          width: 42px;
          min-height: 24px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: var(--bg-tertiary);
          font-size: 13px;
          letter-spacing: 0;
          line-height: 1;
        }

        .artist-public-profile-panel {
          width: 100%;
          pointer-events: none;
        }

        .artist-public-profile-heading {
          display: flex;
          width: 100%;
          align-items: baseline;
          justify-content: space-between;
          gap: 18px;
        }

        .artist-public-profile-label {
          color: var(--text-primary);
          font-family: var(--font-roboto-mono-filmwave), monospace;
          font-size: 13px;
          font-weight: 300;
          letter-spacing: 0;
          line-height: 1;
          text-transform: uppercase;
        }

        .artist-public-profile-meta {
          position: absolute;
          top: calc(100% + 12px);
          right: 0;
          z-index: 5;
          display: flex;
          width: 62%;
          min-width: 0;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 8px 18px;
          margin: 0;
          color: var(--text-primary);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: 11px;
          font-weight: 300;
          letter-spacing: 0;
          line-height: 1.2;
          pointer-events: auto;
        }

        .artist-public-location {
          color: var(--text-primary);
          font-weight: 300;
        }

        .artist-public-links {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-start;
          gap: 8px 14px;
          pointer-events: auto;
        }

        .artist-public-links a {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--text-primary);
          font-weight: 300;
          transition: opacity 150ms ease;
        }

        .artist-public-links a:hover {
          opacity: 0.62;
        }

        .artist-public-links svg {
          display: block;
          flex: 0 0 auto;
        }

        .artist-public-bio,
        .artist-public-bio-editor {
          width: 100%;
          margin: 9px 0 0;
          color: var(--text-primary);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: 11px;
          font-weight: 300;
          letter-spacing: -0.008em;
          line-height: 1.5;
          pointer-events: auto;
        }

        .artist-public-bio-editor,
        .artist-public-intro-editor {
          position: absolute;
        }

        .artist-public-bio-editor {
          position: relative;
        }

        .artist-public-character-count {
          position: absolute;
          right: 2px;
          bottom: 2px;
          z-index: 2;
          color: var(--text-muted);
          font-family: var(--font-roboto-mono-filmwave), monospace;
          font-size: 9px;
          font-weight: 300;
          letter-spacing: 0;
          line-height: 1;
          pointer-events: none;
        }

        .artist-public-intro-editor .artist-public-character-count {
          color: rgba(255, 255, 255, 0.72);
        }

        .artist-public-edit-control {
          box-sizing: border-box;
          border: 0;
          border-radius: 2px;
          background: transparent;
          color: inherit;
          outline: 1px dashed color-mix(in srgb, currentColor 32%, transparent);
          outline-offset: 4px;
          transition: background 140ms ease, outline-color 140ms ease;
          pointer-events: auto;
        }

        .artist-public-edit-control:hover,
        .artist-public-edit-control:focus {
          background: color-mix(in srgb, currentColor 4%, transparent);
          outline-color: currentColor;
        }

        .artist-public-edit-control:focus {
          box-shadow: none;
        }

        input.artist-public-edit-control,
        textarea.artist-public-edit-control {
          padding: 0;
          appearance: none;
        }

        textarea.artist-public-edit-control {
          resize: none;
          overflow: hidden;
          field-sizing: content;
        }

        input.artist-public-type.artist-public-edit-control {
          width: 15%;
          min-width: 160px;
          color: #fff;
        }

        textarea.artist-public-intro-input.artist-public-edit-control {
          width: 100%;
          min-height: 2.7em;
          padding: 0 0 15px;
          color: inherit;
          font: inherit;
          letter-spacing: inherit;
          line-height: inherit;
        }

        input.artist-public-name.artist-public-edit-control {
          z-index: 6;
          display: block;
          width: 73%;
          min-width: 0;
          height: 1.04em;
          color: var(--text-primary);
          background: color-mix(in srgb, var(--bg-primary) 88%, transparent);
          mix-blend-mode: normal;
        }

        textarea.artist-public-bio-input.artist-public-edit-control {
          width: 100%;
          min-height: 6.4em;
          margin: 0;
          padding: 0 0 15px;
          color: inherit;
          font: inherit;
          letter-spacing: inherit;
          line-height: inherit;
        }

        .artist-public-feature-edit-overlay {
          position: absolute;
          inset: 0;
          z-index: 4;
          cursor: pointer;
          background: transparent;
          transition: background 140ms ease;
        }

        .artist-public-feature-edit-overlay::after {
          content: "";
          position: absolute;
          inset: 10px;
          border: 1px dashed rgba(255, 255, 255, 0.82);
          pointer-events: none;
        }

        .artist-public-feature-edit-overlay:hover {
          background: rgba(0, 0, 0, 0.08);
        }

        .artist-public-feature-edit-overlay span {
          position: absolute;
          top: 18px;
          right: 18px;
          z-index: 1;
          padding: 8px 10px;
          border-radius: 4px;
          background: rgba(17, 17, 17, 0.82);
          color: #fff;
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0;
          line-height: 1;
        }

        .artist-public-feature-edit-overlay input {
          display: none;
        }

        .artist-public-edit-meta-grid {
          display: grid;
          width: 100%;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px 14px;
          pointer-events: auto;
        }

        .artist-public-edit-meta-field {
          display: grid;
          min-width: 0;
          gap: 5px;
        }

        .artist-public-edit-meta-field > span {
          color: var(--text-primary);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0;
          line-height: 1;
        }

        .artist-public-edit-meta-field input {
          width: 100%;
          min-width: 0;
          padding: 3px 4px;
          color: var(--text-primary);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: 11px;
          font-weight: 300;
          line-height: 1.2;
        }

        .artist-public-section {
          padding: 0 0 44px;
        }

        .artist-public-section-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 16px;
        }

        .artist-public-section-title {
          margin: 0;
          font-family: var(--filmwave-section-title-font-family);
          font-size: var(--filmwave-section-title-font-size);
          font-weight: var(--filmwave-section-title-font-weight);
          line-height: var(--filmwave-section-title-line-height);
          letter-spacing: var(--filmwave-section-title-letter-spacing);
        }

        .artist-public-section-count {
          color: var(--text-muted);
          font-size: 11px;
        }

        .artist-public-music {
          margin: 0 calc(var(--filmwave-page-gutter) * -1);
        }

        .artist-public-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
        }

        .artist-public-card {
          min-width: 0;
        }

        .artist-public-card-art {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 0;
          background: var(--bg-secondary);
        }

        .artist-public-playlist-card-art {
          aspect-ratio: 16 / 9;
        }

        .artist-public-card-art img,
        .artist-public-card-placeholder {
          width: 100%;
          height: 100%;
        }

        .artist-public-card-art img {
          display: block;
          object-fit: cover;
        }

        .artist-public-card-placeholder {
          background:
            radial-gradient(circle at 68% 22%, rgba(255,255,255,0.08), transparent 26%),
            linear-gradient(145deg, var(--bg-secondary), var(--bg-tertiary));
        }

        .artist-public-card-copy {
          padding-top: 10px;
        }

        .artist-public-card-copy h3 {
          margin: 0;
          overflow: hidden;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .artist-public-card-copy p {
          margin: 4px 0 0;
          color: var(--text-muted);
          font-size: 11px;
          line-height: 1.45;
        }

        .artist-public-card-description {
          display: -webkit-box;
          margin-top: 7px;
          overflow: hidden;
          color: var(--text-secondary);
          font-size: 11px;
          line-height: 1.5;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .artist-public-empty {
          display: flex;
          min-height: 180px;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 12px;
        }

        .artist-public-footer {
          padding-top: 10px;
        }

        @media (max-width: 980px) {
          .artist-public-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .artist-public-top,
          .artist-public-page-editing .artist-public-top {
            padding-top: var(--filmwave-page-gutter);
            padding-bottom: clamp(64px, 5vw, 82px);
          }

          .artist-public-feature-grid {
            display: flex;
            min-height: 0;
            flex-direction: column;
            gap: 22px;
            isolation: auto;
          }

          .artist-public-type,
          .artist-public-intro,
          .artist-public-intro-editor,
          .artist-public-name,
          .artist-public-feature-media,
          .artist-public-profile-meta {
            position: relative;
            top: auto;
            right: auto;
            bottom: auto;
            left: auto;
          }

          .artist-public-type {
            order: 1;
            width: 100%;
            color: var(--text-primary);
          }

          .artist-public-intro,
          .artist-public-intro-editor {
            order: 7;
            width: 100%;
            max-width: 720px;
            color: var(--text-primary);
          }

          .artist-public-intro-editor .artist-public-character-count {
            color: var(--text-muted);
          }

          .artist-public-name {
            order: 4;
            width: 100%;
            margin: 4px 0 0;
            color: var(--text-primary);
            font-size: var(--artist-name-full-fit-size);
            white-space: nowrap;
            mix-blend-mode: normal;
          }

          input.artist-public-name.artist-public-edit-control {
            width: 100%;
          }

          input.artist-public-type.artist-public-edit-control,
          textarea.artist-public-intro-input.artist-public-edit-control {
            width: 100%;
            min-width: 0;
            color: var(--text-primary);
          }

          .artist-public-left-stack {
            display: contents;
          }

          .artist-public-stats {
            order: 5;
          }

          .artist-public-stat-row {
            grid-template-columns: 42px auto;
          }

          .artist-public-stat-count {
            width: 42px;
          }

          .artist-public-feature-media {
            order: 6;
            width: 100%;
            aspect-ratio: 1.75 / 1;
          }

          .artist-public-profile-panel {
            order: 8;
            position: relative;
            inset: auto;
            display: flex;
            width: 100%;
            flex-direction: column;
            justify-content: flex-start;
            padding-top: 8px;
            pointer-events: auto;
          }

          .artist-public-profile-heading {
            width: 100%;
          }

          .artist-public-bio,
          .artist-public-bio-editor {
            width: 100%;
            margin-top: 9px;
          }

          .artist-public-profile-meta {
            order: 9;
            width: 100%;
            justify-content: flex-end;
            margin-top: -10px;
          }

          textarea.artist-public-bio-input.artist-public-edit-control {
            width: 100%;
          }
        }

        @media (max-width: 760px) {
          .artist-public-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }
        }

        @media (max-width: 560px) {
          .artist-public-stat-row {
            font-size: 18px;
          }

          .artist-public-edit-meta-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 480px) {
          .artist-public-feature-listen {
            right: 18px;
            bottom: 18px;
          }

          .artist-public-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <RootElement
        className={`artist-public-page${embedded ? " artist-public-page-embedded" : ""}${
          editMode ? " artist-public-page-editing" : ""
        }`}
      >
        <div className="artist-public-shell">
          <section className="artist-public-top">
            <div className="artist-public-feature-grid">
              {editMode ? (
                <input
                  type="text"
                  aria-label="Artist designation"
                  className="artist-public-type artist-public-edit-control"
                  value={displayArtist.designation ?? ""}
                  maxLength={160}
                  placeholder="Artist designation"
                  onChange={(event) =>
                    updateField("designation", event.target.value)
                  }
                />
              ) : displayArtist.designation ? (
                <div className="artist-public-type">{displayArtist.designation}</div>
              ) : null}

              {editMode ? (
                <div className="artist-public-intro-editor">
                  <textarea
                    aria-label="Intro text"
                    className="artist-public-intro-input artist-public-edit-control"
                    value={displayArtist.intro_text ?? ""}
                    maxLength={114}
                    rows={2}
                    placeholder="Intro text"
                    onChange={(event) =>
                      updateField("intro_text", event.target.value)
                    }
                  />
                  <span className="artist-public-character-count" aria-hidden="true">
                    {(displayArtist.intro_text ?? "").length} / 114
                  </span>
                </div>
              ) : displayArtist.intro_text ? (
                <p className="artist-public-intro">{displayArtist.intro_text}</p>
              ) : null}

              <div className="artist-public-feature-media">
                {featureImageUrl ? (
                  <img
                    src={featureImageUrl}
                    alt=""
                    className="artist-public-feature-image"
                  />
                ) : (
                  <div
                    className="artist-public-feature-fallback"
                    aria-hidden="true"
                  />
                )}
                {editMode ? (
                  <label className="artist-public-feature-edit-overlay">
                    <span>Replace Feature Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = "";
                        if (file) onFeatureImageChange?.(file);
                      }}
                    />
                  </label>
                ) : (
                  <ArtistFeaturePlayControl songs={songs} />
                )}
              </div>

              {editMode ? (
                <input
                  type="text"
                  aria-label="Artist name"
                  className="artist-public-name artist-public-edit-control"
                  style={artistNameStyle}
                  value={displayArtist.name}
                  maxLength={160}
                  onChange={(event) => updateField("name", event.target.value)}
                />
              ) : (
                <h1 className="artist-public-name" style={artistNameStyle}>
                  {displayArtist.name}
                </h1>
              )}

              <div className="artist-public-left-stack">
                <div className="artist-public-stats">
                  <span className="artist-public-stat-row">
                    <span className="artist-public-stat-count">{songs.length}</span>
                    <span>{songs.length === 1 ? "Song" : "Songs"}</span>
                  </span>
                  <span className="artist-public-stat-row">
                    <span className="artist-public-stat-count">{releases.length}</span>
                    <span>Albums / Releases</span>
                  </span>
                  <span className="artist-public-stat-row">
                    <span className="artist-public-stat-count">{playlists.length}</span>
                    <span>{playlists.length === 1 ? "Playlist" : "Playlists"}</span>
                  </span>
                </div>

                {showProfilePanel ? (
                  <div className="artist-public-profile-panel">
                    <div className="artist-public-profile-heading">
                      <span className="artist-public-profile-label">
                        Artist Profile
                      </span>
                    </div>

                    {editMode ? (
                      <div className="artist-public-bio-editor">
                        <textarea
                          aria-label="Artist bio"
                          className="artist-public-bio-input artist-public-edit-control"
                          value={displayArtist.bio ?? ""}
                          maxLength={383}
                          rows={5}
                          placeholder="Artist bio"
                          onChange={(event) =>
                            updateField("bio", event.target.value)
                          }
                        />
                        <span className="artist-public-character-count" aria-hidden="true">
                          {(displayArtist.bio ?? "").length} / 383
                        </span>
                      </div>
                    ) : displayArtist.bio ? (
                      <p className="artist-public-bio">{displayArtist.bio}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>

              {showProfileMeta ? (
                <div className="artist-public-profile-meta">
                  {editMode ? (
                    <div className="artist-public-edit-meta-grid">
                      <label className="artist-public-edit-meta-field">
                        <span>Location</span>
                        <input
                          type="text"
                          className="artist-public-edit-control"
                          value={displayArtist.location ?? ""}
                          maxLength={160}
                          placeholder="City, Province / State"
                          onChange={(event) =>
                            updateField("location", event.target.value)
                          }
                        />
                      </label>
                      <label className="artist-public-edit-meta-field">
                        <span>Website</span>
                        <input
                          type="url"
                          className="artist-public-edit-control"
                          value={displayArtist.website_url ?? ""}
                          placeholder="https://"
                          onChange={(event) =>
                            updateField("website_url", event.target.value)
                          }
                        />
                      </label>
                      <label className="artist-public-edit-meta-field">
                        <span>Instagram</span>
                        <input
                          type="url"
                          className="artist-public-edit-control"
                          value={displayArtist.instagram_url ?? ""}
                          placeholder="https://"
                          onChange={(event) =>
                            updateField("instagram_url", event.target.value)
                          }
                        />
                      </label>
                      <label className="artist-public-edit-meta-field">
                        <span>Spotify</span>
                        <input
                          type="url"
                          className="artist-public-edit-control"
                          value={displayArtist.spotify_url ?? ""}
                          placeholder="https://"
                          onChange={(event) =>
                            updateField("spotify_url", event.target.value)
                          }
                        />
                      </label>
                      <label className="artist-public-edit-meta-field">
                        <span>YouTube</span>
                        <input
                          type="url"
                          className="artist-public-edit-control"
                          value={displayArtist.youtube_url ?? ""}
                          placeholder="https://"
                          onChange={(event) =>
                            updateField("youtube_url", event.target.value)
                          }
                        />
                      </label>
                    </div>
                  ) : (
                    <>
                      {displayArtist.location ? (
                        <span className="artist-public-location">
                          {displayArtist.location}
                        </span>
                      ) : null}
                      {externalLinks.length > 0 ? (
                        <div className="artist-public-links">
                          {externalLinks.map(([label, href]) => (
                            <a
                              key={label}
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                            >
                              {label === "Instagram" ? <InstagramIcon /> : null}
                              <span>{label}</span>
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </section>

          <section className="artist-public-section">
            <div className="artist-public-section-header">
              <h2 className="artist-public-section-title">Music</h2>
              <span className="artist-public-section-count">
                {songs.length} {songs.length === 1 ? "track" : "tracks"}
              </span>
            </div>
            {songs.length > 0 ? (
              <div className="artist-public-music">
                <PublicArtistMusic songs={songs} />
              </div>
            ) : (
              <div className="artist-public-empty">No published music yet.</div>
            )}
          </section>

          {releases.length > 0 ? (
            <section className="artist-public-section">
              <div className="artist-public-section-header">
                <h2 className="artist-public-section-title">Releases</h2>
                <span className="artist-public-section-count">
                  {releases.length} {releases.length === 1 ? "release" : "releases"}
                </span>
              </div>
              <div className="artist-public-grid">
                {releases.map((release) => (
                  <ReleaseCard key={release.id} release={release} />
                ))}
              </div>
            </section>
          ) : null}

          {playlists.length > 0 ? (
            <section className="artist-public-section">
              <div className="artist-public-section-header">
                <h2 className="artist-public-section-title">Playlists</h2>
                <span className="artist-public-section-count">
                  {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}
                </span>
              </div>
              <div className="artist-public-grid">
                {playlists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            </section>
          ) : null}

          <div className="artist-public-footer">
            <Footer pageGutter={false} />
          </div>
        </div>
      </RootElement>
    </>
  );
}
