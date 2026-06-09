export function DesktopFolderGlyph({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "project-folder-glyph small" : "project-folder-glyph"}>
      <span className="project-folder-glyph-tab" />
      <span className="project-folder-glyph-body" />
    </span>
  );
}

export function DesktopMusicGlyph({ small = false }: { small?: boolean }) {
  return (
    <span className={small ? "project-music-glyph small" : "project-music-glyph"}>
      ♪
    </span>
  );
}
