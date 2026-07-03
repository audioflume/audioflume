export default function DiscoverTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        .discover-header-search-row {
          height: 50px !important;
          padding-left: 31px !important;
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
          transform: translateY(4px) !important;
        }

        main > section {
          padding-top: calc(var(--filmwave-header-height, 56px) + 50px) !important;
        }
      `}</style>
      {children}
    </>
  );
}
