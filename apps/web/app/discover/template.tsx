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
          width: 14px !important;
          flex-basis: 14px !important;
          margin-left: 4px !important;
          margin-right: 1px !important;
        }

        .discover-header-search-row .discover-header-search-clear svg {
          width: 12px !important;
          height: 12px !important;
          transform: scale(1.25) !important;
          transform-origin: center !important;
        }

        .discover-header-search-row .discover-header-search-clear path {
          d: path("M6.34 4.93 12 10.59l5.66-5.66a1 1 0 1 1 1.41 1.41L13.41 12l5.66 5.66a1 1 0 0 1-1.41 1.41L12 13.41l-5.66 5.66a1 1 0 0 1-1.41-1.41L10.59 12 4.93 6.34a1 1 0 0 1 1.41-1.41Z") !important;
          fill: currentColor !important;
          stroke: none !important;
          transform: scale(0.5) !important;
          transform-origin: 0 0 !important;
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
