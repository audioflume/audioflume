const DISCOVER_NO_SEARCH_STYLE = `
  .discover-header-search-row {
    display: none !important;
  }

  main > section {
    padding-top: calc(var(--filmwave-header-height, 56px) + 22px) !important;
  }

  main > section > div[class*="px-8"] {
    padding-top: 0 !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"]
    > div[class*="px-8"]
    > section:first-child
    > div:first-child,
  main > section[class*="ml-[var(--sidebar-width)]"]
    > div[class*="px-8"]
    > section:first-child
    > section {
    display: none !important;
  }

  main > section[class*="ml-[var(--sidebar-width)]"]
    > div[class*="px-8"]
    > section:first-child
    > div[class*="mt-2"][class*="grid"] {
    margin-top: 0 !important;
  }
`;

export default function DiscoverSharedHeaderSearch() {
  return <style>{DISCOVER_NO_SEARCH_STYLE}</style>;
}
