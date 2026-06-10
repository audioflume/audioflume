import type { CSSProperties } from "react";

/**
 * SVG-based project browser glyphs.
 *
 * These replace the previous CSS-only glyphs so the same icon can be
 * rasterized for native drag previews (tauri-plugin-drag) while still
 * rendering crisply in the web and desktop UIs. The components keep the
 * original `small` prop API so every existing call site keeps working.
 *
 * The folder is a close SVG approximation of the original CSS folder
 * (tab + body, vertical gradients, a soft top highlight and bottom shade
 * to mimic the inset bevel). It is not a pixel-identical reproduction of
 * the CSS box-shadow stack, but is visually very close at icon sizes.
 *
 * The music note uses the user-provided note artwork and inherits the
 * surrounding text color via `currentColor`.
 */

type GlyphProps = {
  small?: boolean;
  className?: string;
  style?: CSSProperties;
};

export function FolderGlyph({ small = false, className, style }: GlyphProps) {
  // Preserve the original footprints: 62x54 (large), 19x16 (small).
  const width = small ? 19 : 62;
  const height = small ? 16 : 54;

  return (
    <svg
      className={
        className ??
        (small ? "project-folder-glyph small" : "project-folder-glyph")
      }
      style={style}
      width={width}
      height={height}
      viewBox="0 0 62 54"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Tab gradient: #3b3b3b -> #252525 */}
        <linearGradient id="fw-folder-tab" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3b3b" />
          <stop offset="1" stopColor="#252525" />
        </linearGradient>
        {/* Body gradient: #3a3a3a -> #242424 (48%) -> #151515 */}
        <linearGradient id="fw-folder-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3a3a3a" />
          <stop offset="0.48" stopColor="#242424" />
          <stop offset="1" stopColor="#151515" />
        </linearGradient>
      </defs>

      {/* Tab */}
      <path
        d="M0 10 a4 4 0 0 1 4 -4 h20 a5 5 0 0 1 5 5 v3 H0 Z"
        fill="url(#fw-folder-tab)"
      />
      {/* Tab top highlight */}
      <path
        d="M4 6.5 h20"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1"
        strokeLinecap="round"
      />

      {/* Body */}
      <rect
        x="0"
        y="11"
        width="62"
        height="43"
        rx="5"
        fill="url(#fw-folder-body)"
      />
      {/* Body top highlight (approximates inset top white lines) */}
      <rect
        x="1"
        y="12"
        width="60"
        height="1.4"
        rx="0.7"
        fill="rgba(255,255,255,0.22)"
      />
      {/* Body bottom shade (approximates inset dark bottom line) */}
      <rect
        x="1"
        y="52.4"
        width="60"
        height="1"
        rx="0.5"
        fill="rgba(0,0,0,0.72)"
      />
    </svg>
  );
}

export function MusicGlyph({ small = false, className, style }: GlyphProps) {
  // Preserve the original footprints: 44x44 (large), 22x22 (small) box.
  // The user note is portrait (302.66 x 440.13); fit it within the box
  // height while keeping aspect ratio.
  const box = small ? 22 : 44;
  const noteHeight = small ? 14 : 26;
  const noteWidth = noteHeight * (302.66 / 440.13);

  return (
    <span
      className={
        className ??
        (small ? "project-music-glyph small" : "project-music-glyph")
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: box,
        height: box,
        ...style,
      }}
    >
      <svg
        width={noteWidth}
        height={noteHeight}
        viewBox="0 0 302.66 440.13"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <line
          x1="11"
          y1="440.13"
          x2="11"
          y2="13.68"
          stroke="currentColor"
          strokeWidth="22"
          strokeMiterlimit="10"
        />
        <polygon
          points="11 235.89 291.66 174.16 291.66 75.41 11 13.68 11 235.89"
          fill="none"
          stroke="currentColor"
          strokeWidth="22"
          strokeMiterlimit="10"
        />
      </svg>
    </span>
  );
}
