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

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > div[class*="mt-2"][class*="grid"],
  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > div[class*="mt-2"][class*="grid"] > div[class*="grid"],
  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > div[class*="mt-2"][class*="grid"] > div[class*="grid"] > div[class*="grid-cols-2"] {
    gap: 8px !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "] {
    border-width: 0 !important;
    border-radius: 0 !important;
    background: color-mix(in srgb, var(--bg-primary) 92%, var(--text-primary) 8%) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "]:hover,
  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "]:focus-visible {
    background: color-mix(in srgb, var(--bg-primary) 88%, var(--text-primary) 12%) !important;
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
