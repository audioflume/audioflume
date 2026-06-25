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
    background: color-mix(in srgb, var(--bg-primary) 96%, var(--text-primary) 4%) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "]:hover,
  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "]:focus-visible {
    background: color-mix(in srgb, var(--bg-primary) 94%, var(--text-primary) 6%) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] {
    border-width: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    padding: 0 !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "] {
    grid-template-columns: 24px minmax(0, 1fr) auto auto !important;
    grid-template-rows: auto auto !important;
    align-items: center !important;
    column-gap: 12px !important;
    border-radius: 0 !important;
    background: color-mix(in srgb, var(--bg-primary) 96%, var(--text-primary) 4%) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "] > span:first-child {
    grid-column: 1 !important;
    grid-row: 1 / span 2 !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "] > div:nth-of-type(1),
  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "] > div:nth-of-type(1) > div:first-child {
    display: contents !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "] > div:nth-of-type(1) h3 {
    grid-column: 2 !important;
    grid-row: 1 !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "] > div:nth-of-type(1) > div:first-child > span {
    display: inline !important;
    grid-column: 3 !important;
    grid-row: 1 / span 2 !important;
    align-self: center !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "] > div:nth-of-type(1) > div:last-child {
    grid-column: 2 !important;
    grid-row: 2 !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "] > div:nth-of-type(2) {
    grid-column: 4 !important;
    grid-row: 1 / span 2 !important;
    gap: 18px !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "]:hover,
  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "]:focus-visible {
    background: color-mix(in srgb, var(--bg-primary) 94%, var(--text-primary) 6%) !important;
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
