export default function DiscoverTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .discover-header-search-row {
          height: 50px !important;
          padding: 0 24px 0 20px !important;
        }

        .discover-header-search-row .discover-header-search-form {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          align-items: initial !important;
        }

        .discover-header-search-row .discover-header-search {
          height: 40px !important;
          min-height: 40px !important;
          gap: 8px !important;
          transform: translateY(4px) !important;
        }

        .discover-header-search-row .discover-header-search.has-value {
          gap: 5px !important;
        }

        .discover-header-search-row .discover-header-search-icon {
          margin-left: 4px !important;
          margin-right: 4px !important;
        }

        .discover-header-search-row .discover-header-search-clear {
          width: 14px !important;
          flex: 0 0 14px !important;
          margin-right: 2px !important;
        }

        .discover-header-search-row .discover-header-search-clear svg {
          width: 12px !important;
          height: 12px !important;
          transform: scale(1.25) !important;
          transform-origin: center !important;
        }

        .discover-header-search-row .discover-header-search-divider {
          width: 1px !important;
          height: 16px !important;
          flex: 0 0 1px !important;
          margin-right: 4px !important;
        }

        main > section {
          padding-top: calc(var(--filmwave-header-height, 56px) + 50px) !important;
        }
      `}</style>
      {children}
    </>
  );
}
