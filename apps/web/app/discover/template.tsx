export default function DiscoverTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`.discover-header-search-row{height:50px!important;padding:0 24px 0 20px!important}.discover-header-search-row .discover-header-search-form{display:block!important;width:100%!important;height:100%!important;align-items:initial!important}.discover-header-search-row .discover-header-search{height:40px!important;min-height:40px!important;gap:8px!important;transform:translateY(4px)!important}.discover-header-search-row .discover-header-search.has-value{gap:5px!important}main>section{padding-top:calc(var(--filmwave-header-height,56px) + 50px)!important}`}</style>
      {children}
    </>
  );
}
