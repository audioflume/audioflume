const HEADER_SEARCH_RESPONSIVE_STYLE = `
  :root {
    --filmwave-header-search-width: min(clamp(420px, 45vw, 640px), calc(100vw - 300px));
  }

  @media (max-width: 760px) {
    :root {
      --filmwave-header-search-width: clamp(260px, calc(100vw - 360px), 640px);
    }
  }

  .filmwave-music-header-search-form,
  .filmwave-header-search-form {
    position: fixed !important;
    top: calc(var(--filmwave-header-height) / 2) !important;
    right: auto !important;
    left: 50% !important;
    z-index: 142 !important;
    display: inline-flex !important;
    width: var(--filmwave-header-search-width) !important;
    max-width: var(--filmwave-header-search-width) !important;
    margin: 0 !important;
    margin-right: 0 !important;
    transform: translate(-50%, -50%) !important;
    pointer-events: auto !important;
  }

  .filmwave-music-header-search-form .filmwave-search-pill,
  .filmwave-music-header-search-form .filmwave-search-pill-expanded,
  .filmwave-music-header-search-form .filmwave-search-pill-collapsed,
  .filmwave-header-search-form .filmwave-search-pill,
  .filmwave-header-search-form .filmwave-search-pill-expanded,
  .filmwave-header-search-form .filmwave-search-pill-collapsed {
    width: 100% !important;
    max-width: 100% !important;
  }

  .filmwave-music-header-search-form .filmwave-search-pill-input,
  .filmwave-header-search-form .filmwave-search-pill-input {
    width: 100% !important;
  }
`;

export default function HeaderSearchResponsiveStyles() {
  return <style>{HEADER_SEARCH_RESPONSIVE_STYLE}</style>;
}
