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
    background: color-mix(in srgb, var(--bg-primary) 90%, var(--text-primary) 10%) !important;
  }

  html.light main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "],
  html[data-theme="light"] main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "] {
    background: var(--bg-hover-strong) !important;
  }

  html.light main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "]:hover,
  html.light main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "]:focus-visible,
  html[data-theme="light"] main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "]:hover,
  html[data-theme="light"] main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "]:focus-visible {
    background: color-mix(in srgb, var(--bg-hover-strong) 88%, var(--text-primary) 12%) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] {
    border-width: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    padding: 0 !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] {
    display: block !important;
    column-count: 1;
    column-gap: 8px;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "] {
    position: relative !important;
    display: grid !important;
    width: 100% !important;
    break-inside: avoid !important;
    grid-template-columns: 24px minmax(0, 1fr) auto !important;
    align-items: center !important;
    margin-bottom: 4px !important;
    border-radius: 0 !important;
    background: color-mix(in srgb, var(--bg-primary) 96%, var(--text-primary) 4%) !important;
  }

  html.light main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "],
  html[data-theme="light"] main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "] {
    background: var(--bg-hover-strong) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "] > div:nth-of-type(1) > div:first-child > span {
    position: absolute !important;
    top: 50% !important;
    right: 118px !important;
    display: inline !important;
    transform: translateY(-50%) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "] > div:nth-of-type(2) {
    gap: 18px !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "]:hover,
  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "]:focus-visible {
    background: color-mix(in srgb, var(--bg-primary) 90%, var(--text-primary) 10%) !important;
  }

  html.light main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "]:hover,
  html.light main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "]:focus-visible,
  html[data-theme="light"] main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "]:hover,
  html[data-theme="light"] main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "]:focus-visible {
    background: color-mix(in srgb, var(--bg-hover-strong) 88%, var(--text-primary) 12%) !important;
  }

  @media (min-width: 768px) {
    main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] {
      column-count: 2;
    }
  }

  @media (min-width: 1280px) {
    main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] {
      column-count: 3;
    }
  }

  @media (min-width: 1536px) {
    main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] {
      column-count: 4;
    }
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
