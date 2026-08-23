export type BackendSidebarGlyphName =
  | "dashboard"
  | "analytics"
  | "upload"
  | "queue"
  | "music"
  | "review"
  | "artists"
  | "playlist"
  | "cue"
  | "storage"
  | "settings"
  | "page"
  | "profile"
  | "release"
  | "notifications"
  | "agreements"
  | "earnings"
  | "team";

export default function BackendSidebarGlyph({
  name,
}: {
  name: BackendSidebarGlyphName;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      {name === "dashboard" && (
        <>
          <rect {...common} x="4.5" y="4.5" width="6" height="6" rx="1.2" />
          <rect {...common} x="13.5" y="4.5" width="6" height="6" rx="1.2" />
          <rect {...common} x="4.5" y="13.5" width="6" height="6" rx="1.2" />
          <rect {...common} x="13.5" y="13.5" width="6" height="6" rx="1.2" />
        </>
      )}
      {name === "analytics" && (
        <>
          <path {...common} d="M4.5 19.5V5" />
          <path {...common} d="M4.5 19.5h15" />
          <path {...common} d="m7 15 3.2-3.4 3 2 4.3-5.1" />
        </>
      )}
      {name === "upload" && (
        <>
          <path {...common} d="M12 16V5" />
          <path {...common} d="m8.5 8.5 3.5-3.5 3.5 3.5" />
          <path {...common} d="M5 15.5V19h14v-3.5" />
        </>
      )}
      {name === "queue" && (
        <>
          <path {...common} d="M7.5 7h11M7.5 12h11M7.5 17h11" />
          <circle {...common} cx="4.5" cy="7" r=".7" />
          <circle {...common} cx="4.5" cy="12" r=".7" />
          <circle {...common} cx="4.5" cy="17" r=".7" />
        </>
      )}
      {name === "music" && (
        <>
          <path {...common} d="M9 18V6l9-1.5v11.8" />
          <path {...common} d="M9 9.5 18 8" />
          <ellipse {...common} cx="6.7" cy="18" rx="2.3" ry="1.8" />
          <ellipse {...common} cx="15.7" cy="16.3" rx="2.3" ry="1.8" />
        </>
      )}
      {name === "review" && (
        <>
          <circle {...common} cx="12" cy="12" r="8" />
          <path {...common} d="m8.3 12.2 2.4 2.4 5-5" />
        </>
      )}
      {name === "artists" && (
        <>
          <circle {...common} cx="9" cy="8.5" r="2.5" />
          <path {...common} d="M4.8 18c.5-2.8 1.9-4.4 4.2-4.4 2.4 0 3.8 1.6 4.3 4.4" />
          <path {...common} d="M15.2 6.8a2.3 2.3 0 0 1 0 4.4M15.3 13.8c2.2.2 3.5 1.6 3.9 4.2" />
        </>
      )}
      {name === "playlist" && (
        <>
          <path {...common} d="M5 7h10M5 12h8M5 17h6" />
          <path {...common} d="m16 13.5 3.5 2.2-3.5 2.2Z" />
        </>
      )}
      {name === "cue" && (
        <>
          <path {...common} d="M4 12h3l1.5-5 2.3 10 2.2-8 1.7 6 1.3-3h4" />
          <circle {...common} cx="8.5" cy="7" r="1" />
          <circle {...common} cx="13" cy="9" r="1" />
        </>
      )}
      {name === "storage" && (
        <>
          <ellipse {...common} cx="12" cy="6.5" rx="6.5" ry="2.5" />
          <path {...common} d="M5.5 6.5v5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-5" />
          <path {...common} d="M5.5 11.5v5c0 1.4 2.9 2.5 6.5 2.5s6.5-1.1 6.5-2.5v-5" />
        </>
      )}
      {name === "settings" && (
        <>
          <path {...common} d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h8M16 17h4" />
          <circle {...common} cx="15" cy="7" r="2" />
          <circle {...common} cx="9" cy="12" r="2" />
          <circle {...common} cx="14" cy="17" r="2" />
        </>
      )}
      {name === "page" && (
        <>
          <rect {...common} x="4" y="5" width="16" height="14" rx="2" />
          <path {...common} d="M4 9h16" />
          <path {...common} d="M7 7h.01M10 7h.01" />
        </>
      )}
      {name === "profile" && (
        <>
          <circle {...common} cx="12" cy="8" r="3" />
          <path {...common} d="M6.5 19c.7-3.2 2.5-5 5.5-5s4.8 1.8 5.5 5" />
        </>
      )}
      {name === "release" && (
        <>
          <rect {...common} x="5" y="4.5" width="14" height="15" rx="2" />
          <circle {...common} cx="12" cy="12" r="3.5" />
          <circle {...common} cx="12" cy="12" r=".8" />
        </>
      )}
      {name === "notifications" && (
        <>
          <path {...common} d="M6.5 16.5h11l-1.2-1.8V11a4.3 4.3 0 0 0-8.6 0v3.7L6.5 16.5Z" />
          <path {...common} d="M10 18.2c.5.8 1.1 1.2 2 1.2s1.5-.4 2-1.2" />
        </>
      )}
      {name === "agreements" && (
        <>
          <path {...common} d="M7 4.5h7l3 3v12H7Z" />
          <path {...common} d="M14 4.5v3h3" />
          <path {...common} d="m9.5 14 1.6 1.6 3.4-3.4" />
        </>
      )}
      {name === "earnings" && (
        <>
          <circle {...common} cx="12" cy="12" r="7.5" />
          <path {...common} d="M14.7 9.3c-.6-.7-1.5-1-2.6-1-1.4 0-2.4.7-2.4 1.8 0 2.8 5.1 1.2 5.1 4 0 1.1-1 1.9-2.6 1.9-1.2 0-2.2-.4-2.9-1.2M12 6.8v10.4" />
        </>
      )}
      {name === "team" && (
        <>
          <circle {...common} cx="8.5" cy="9" r="2.4" />
          <circle {...common} cx="15.5" cy="9" r="2.4" />
          <path {...common} d="M4.5 18c.4-2.6 1.8-4 4-4 1.4 0 2.5.5 3.2 1.5M19.5 18c-.4-2.6-1.8-4-4-4-1.4 0-2.5.5-3.2 1.5" />
        </>
      )}
    </svg>
  );
}
