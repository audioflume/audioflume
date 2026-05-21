export function FolderGlyph({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "project-folder-glyph small" : "project-folder-glyph"}>
      <span className="project-folder-glyph-tab" />
      <span className="project-folder-glyph-body" />
    </span>
  );
}

export function MusicGlyph({ small = false }: { small?: boolean }) {
  return <span className={small ? "project-music-glyph small" : "project-music-glyph"}>♪</span>;
}

export function PlayPauseIcon({ playing }: { playing: boolean }) {
  return playing ? (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M7 5h3v14H7zM14 5h3v14h-3z" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}
