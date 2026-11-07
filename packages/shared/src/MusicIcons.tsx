type MusicIconProps = {
  className?: string;
  size?: number;
};

type MusicCheckIconProps = MusicIconProps & {
  strokeWidth?: number;
};

export function MusicCheckIcon({
  size = 13,
  className,
  strokeWidth = 2.6,
}: MusicCheckIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M5 12.5L9.5 17L19 7"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function MusicPlusIcon({ size = 13, className }: MusicIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M12 5V19"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M5 12H19"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function MusicPlaylistIcon({ className, size = 16 }: MusicIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M5 7H19"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      <path
        d="M5 12H15"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />

      <path
        d="M5 17H12"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Artist label with the existing Audioflume circle-A mark, shared by web and desktop. */
export function AudioflumeArtistLabel({ artist }: { artist: string }) {
  if (artist.trim().toLowerCase() !== "audioflume") return artist;

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, maxWidth: "100%", verticalAlign: "middle" }}>
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{artist}</span>
      <svg width="10" height="10" viewBox="0 0 39.82 39.53" fill="#333333" aria-hidden="true" style={{ flexShrink: 0 }}>
        <path d="M11.31,23.98c0-1.28.27-2.32.81-3.15.54-.82,1.27-1.47,2.19-1.93.92-.47,1.96-.8,3.11-1.01,1.15-.21,2.34-.34,3.57-.39l3.17-.11v-.74c0-1.5-.32-2.57-.96-3.22-.64-.65-1.67-.98-3.09-.98s-2.39.23-3.05.7c-.66.47-1.09,1.12-1.29,1.95l-3.5-.37c.34-1.79,1.18-3.1,2.52-3.94,1.34-.83,3.16-1.25,5.47-1.25,2.77,0,4.74.64,5.91,1.93,1.16,1.29,1.75,3.11,1.75,5.47v12.29h-3.68v-2.47c-.71.81-1.58,1.5-2.61,2.06-1.03.56-2.29.85-3.79.85-1.94,0-3.51-.48-4.71-1.44-1.2-.96-1.8-2.38-1.8-4.27ZM15.14,23.83c0,.88.27,1.59.81,2.12.54.53,1.41.79,2.61.79,1.67,0,3.02-.42,4.05-1.25,1.03-.83,1.55-2.05,1.55-3.64v-1.91l-2.94.11c-1.57.05-2.8.23-3.68.53-.88.31-1.5.73-1.86,1.27-.36.54-.53,1.2-.53,1.99Z"/>
        <path d="M19.91,39.23C9.18,39.23.44,30.5.44,19.76S9.18.3,19.91.3s19.47,8.73,19.47,19.47-8.73,19.47-19.47,19.47ZM19.91,3.5C10.94,3.5,3.64,10.79,3.64,19.76s7.3,16.27,16.27,16.27,16.27-7.3,16.27-16.27S28.88,3.5,19.91,3.5Z"/>
      </svg>
    </span>
  );
}
