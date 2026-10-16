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
 * The music note uses the user-provided note artwork (a filled path) and
 * inherits the surrounding text color via `currentColor`.
 */

type GlyphProps = {
  small?: boolean;
  className?: string;
  style?: CSSProperties;
};

// User-provided eighth-note artwork.
const NOTE_VIEWBOX_WIDTH = 48.83;
const NOTE_VIEWBOX_HEIGHT = 66.94;
const NOTE_ASPECT = NOTE_VIEWBOX_WIDTH / NOTE_VIEWBOX_HEIGHT;

export function FolderGlyph({ small = false, className, style }: GlyphProps) {
  // Keep grid-view folders visually balanced with the music file glyph.
  const width = small ? 19 : 58;
  const height = small ? 16 : 50;

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
      <path
        d="M0 10 a4 4 0 0 1 4 -4 h20 a5 5 0 0 1 5 5 v3 H0 Z"
        fill="#151515"
      />
      <rect
        x="0"
        y="11"
        width="62"
        height="43"
        rx="5"
        fill="#111111"
      />
    </svg>
  );
}

export function MusicGlyph({ small = false, className, style }: GlyphProps) {
  // Preserve the original footprints: 44x44 (large), 22x22 (small) box.
  // Note sits comfortably smaller than the box, similar to the original ♪.
  const box = small ? 22 : 44;
  const noteHeight = small ? 9 : 16;
  const noteWidth = noteHeight * NOTE_ASPECT;

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
        viewBox="0 0 48.83 66.94"
        fill="currentColor"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        focusable="false"
      >
        <path d="M48.62,15.64c-2-9.61-18.89-7.59-19.97-15.64h-3.76v54.49c-2.33-2.42-6.6-4.04-11.5-4.04-7.39,0-13.38,3.69-13.38,8.25s5.99,8.25,13.38,8.25c.15,0,.3-.01.45-.01.16,0,.32.01.49.01,7.91,0,14.32-3.69,14.32-8.25V11.74c3.46,4,12.53,2.97,14.12,7.65.66,1.93-.05,3.81-2.16,6.31l2.43,1.94c3.44-3.95,6.66-6.82,5.59-12Z" />
      </svg>
    </span>
  );
}
