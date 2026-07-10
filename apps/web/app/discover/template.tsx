import type { ReactNode } from "react";
import DiscoverSearchHeroPortal from "./DiscoverSearchHeroPortal";
import SuggestedForYouPortal from "./SuggestedForYouPortal";

export default function DiscoverTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <style>{`
        .discover-header-search-row {
          display: none !important;
        }
      `}</style>
      <DiscoverSearchHeroPortal />
      <SuggestedForYouPortal />
      {children}
    </>
  );
}
