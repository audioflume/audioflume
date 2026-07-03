export default function DiscoverTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .discover-header-search-row {
          height: 50px !important;
          padding-left: 32px !important;
          padding-right: 24px !important;
        }

        .discover-header-search-row .discover-header-search-form {
          display: block !important;
          width: 100% !important;
          height: 100% !important;
        }

        .discover-header-search-row .discover-header-search {
          height: 40px !important;
          min-height: 40px !important;
          gap: 12px !important;
          transform: translateY(4px) !important;
        }

        .discover-header-search-row .discover-header-search.has-value {
          gap: 5px !important;
        }

        .discover-header-search-row .discover-header-search-clear {
          position: relative !important;
          width: 14px !important;
          flex-basis: 14px !important;
          margin-left: 3px !important;
          margin-right: 2px !important;
        }

        .discover-header-search-row .discover-header-search-clear svg {
          display: none !important;
        }

        .discover-header-search-row .discover-header-search-clear::before,
        .discover-header-search-row .discover-header-search-clear::after {
          content: "" !important;
          position: absolute !important;
          top: 50% !important;
          left: 50% !important;
          display: block !important;
          width: 10px !important;
          height: 1.8px !important;
          border-radius: 999px !important;
          background: currentColor !important;
          transform-origin: center !important;
        }

        .discover-header-search-row .discover-header-search-clear::before {
          transform: translate(-50%, -50%) translateX(1px) rotate(45deg) !important;
        }

        .discover-header-search-row .discover-header-search-clear::after {
          transform: translate(-50%, -50%) translateX(1px) rotate(-45deg) !important;
        }

        .discover-header-search-row .discover-header-search-divider {
          width: 1px !important;
          height: 16px !important;
          flex-basis: 1px !important;
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
