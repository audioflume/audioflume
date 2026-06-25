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

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(3) a[href^="/curated-playlists/"] {
    position: relative !important;
    display: block !important;
    overflow: hidden !important;
    background: var(--bg-secondary) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(3) a[href^="/curated-playlists/"] > div:first-child {
    height: 245px !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(3) a[href^="/curated-playlists/"] > div:nth-child(2) {
    position: absolute !important;
    z-index: 10 !important;
    right: 16px !important;
    bottom: 16px !important;
    left: 16px !important;
    margin-top: 0 !important;
    border-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(3) a[href^="/curated-playlists/"] > div:nth-child(2) h3 {
    color: white !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(3) a[href^="/curated-playlists/"] > div:nth-child(2) p {
    color: rgba(255, 255, 255, 0.68) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(3) a[href^="/curated-playlists/"] > div:nth-child(2) > div:last-child {
    margin-top: 0 !important;
    padding-top: 14px !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(3) a[href^="/curated-playlists/"] > div:nth-child(2) > div:last-child > div {
    background: rgba(255, 255, 255, 0.12) !important;
    color: rgba(255, 255, 255, 0.78) !important;
    backdrop-filter: blur(12px) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(3) a[href^="/curated-playlists/"]:hover > div:nth-child(2) > div:last-child > div {
    background: white !important;
    color: black !important;
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
