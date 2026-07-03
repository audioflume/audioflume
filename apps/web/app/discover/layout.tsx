import DiscoverSharedHeaderSearch from "./DiscoverSharedHeaderSearch";

const DISCOVER_LAYOUT_STYLE = `
  .discover-header-search-row {
    position: fixed !important;
    top: var(--filmwave-header-height, 56px) !important;
    right: 0 !important;
    left: 0 !important;
    z-index: var(--filmwave-z-search-filter, 60) !important;
    display: flex !important;
    height: var(--filmwave-header-height, 56px) !important;
    align-items: center !important;
    border-bottom: 1px solid var(--border) !important;
    background: var(--bg-primary) !important;
    padding: 0 28px !important;
  }

  .discover-header-search-form {
    display: flex !important;
    width: 100% !important;
    height: 100% !important;
    align-items: center !important;
  }

  .discover-header-search {
    box-sizing: border-box !important;
    display: flex !important;
    width: 100% !important;
    height: 40px !important;
    min-height: 40px !important;
    align-items: center !important;
    gap: 8px !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    background-color: transparent !important;
    background-image: none !important;
    box-shadow: none !important;
    -webkit-backdrop-filter: none !important;
    backdrop-filter: none !important;
    padding: 0 !important;
    cursor: text !important;
  }

  .discover-header-search.has-value {
    gap: 5px !important;
  }

  .discover-header-search-icon {
    display: inline-flex !important;
    width: 16px !important;
    height: 40px !important;
    flex: 0 0 16px !important;
    align-items: center !important;
    justify-content: center !important;
    color: var(--text-muted) !important;
    pointer-events: none !important;
  }

  .discover-header-search-icon svg {
    display: block !important;
    width: 16px !important;
    height: 16px !important;
  }

  .discover-header-search-clear {
    box-sizing: border-box !important;
    display: inline-flex !important;
    width: 14px !important;
    height: 40px !important;
    flex: 0 0 14px !important;
    align-items: center !important;
    justify-content: center !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: transparent !important;
    color: var(--text-muted) !important;
    cursor: pointer !important;
    margin-right: 2px !important;
    padding: 0 !important;
  }

  .discover-header-search-clear:hover {
    color: var(--text-primary) !important;
  }

  .discover-header-search-clear svg {
    display: block !important;
    width: 12px !important;
    height: 12px !important;
  }

  .discover-header-search-divider {
    display: inline-flex !important;
    width: 1px !important;
    height: 16px !important;
    flex: 0 0 1px !important;
    border-radius: 1px !important;
    background: var(--border) !important;
    margin-right: 4px !important;
  }

  .discover-header-search-input {
    display: block !important;
    min-width: 0 !important;
    height: 40px !important;
    flex: 1 1 auto !important;
    border: 0 !important;
    background: transparent !important;
    color: var(--text-primary) !important;
    font-family: inherit !important;
    font-size: 15px !important;
    font-weight: 300 !important;
    line-height: 40px !important;
    outline: none !important;
    padding: 0 !important;
  }

  .discover-header-search-input::placeholder {
    color: var(--text-muted) !important;
    font-size: 15px !important;
    font-weight: 300 !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > div:first-child {
    display: none !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form {
    box-sizing: border-box !important;
    height: 50px !important;
    min-height: 50px !important;
    align-items: center !important;
    gap: 8px !important;
    border: 0 !important;
    border-radius: 0 !important;
    background: var(--filmwave-chrome-surface) !important;
    background-color: var(--filmwave-chrome-surface) !important;
    padding: 0 24px !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form:hover,
  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form:focus-within {
    background: var(--filmwave-chrome-surface) !important;
    background-color: var(--filmwave-chrome-surface) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form > div:first-child {
    width: 16px !important;
    height: 40px !important;
    flex: 0 0 16px !important;
    border-radius: 0 !important;
    background: transparent !important;
    color: var(--text-muted) !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form > div:first-child svg {
    width: 16px !important;
    height: 16px !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form > input {
    height: 40px !important;
    font-size: 15px !important;
    font-weight: 300 !important;
    line-height: 40px !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form > input::placeholder {
    color: var(--text-muted) !important;
    font-size: 15px !important;
    font-weight: 300 !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form > div[class*="lg:flex"],
  main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:first-child > section > form > button[type="submit"] {
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
    background: color-mix(in srgb, var(--bg-primary) 92%, var(--text-primary) 8%) !important;
  }

  html.light main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "],
  html[data-theme="light"] main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "] {
    background: color-mix(in srgb, var(--bg-primary) 94%, var(--text-primary) 6%) !important;
  }

  html.light main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "]:hover,
  html.light main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "]:focus-visible,
  html[data-theme="light"] main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "]:hover,
  html[data-theme="light"] main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:nth-of-type(2) > div[class*="grid"] > article[aria-label^="Play "]:focus-visible {
    background: color-mix(in srgb, var(--bg-primary) 91%, var(--text-primary) 9%) !important;
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
    background: color-mix(in srgb, var(--bg-primary) 94%, var(--text-primary) 6%) !important;
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
    background: color-mix(in srgb, var(--bg-primary) 92%, var(--text-primary) 8%) !important;
  }

  html.light main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "]:hover,
  html.light main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "]:focus-visible,
  html[data-theme="light"] main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "]:hover,
  html[data-theme="light"] main > section[class*="ml-[var(--sidebar-width)]"] > div[class*="px-8"] > section:last-of-type > div[class*="rounded"] > div[class*="grid"] > article[aria-label^="Play "]:focus-visible {
    background: color-mix(in srgb, var(--bg-primary) 91%, var(--text-primary) 9%) !important;
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
      <DiscoverSharedHeaderSearch />
      {children}
    </>
  );
}
