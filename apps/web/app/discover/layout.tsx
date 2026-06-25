const DISCOVER_LAYOUT_STYLE = `
  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > div:first-child {
    display: none !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] a[href^="/curated-playlists/"],
  main > section[class*="ml-[var(--sidebar-width)]"] .discover-skeleton-card,
  main > section[class*="ml-[var(--sidebar-width)]"] .discover-skeleton-shelf-card {
    border-width: 0 !important;
    border-radius: 0 !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] article[aria-label^="Play "] > div:first-of-type {
    border-radius: 0 !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] a[href^="/curated-playlists/"]:hover {
    border-width: 0 !important;
    border-color: transparent !important;
  }
`;

export default function DiscoverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <style>{DISCOVER_LAYOUT_STYLE}</style>
      {children}
    </>
  );
}
