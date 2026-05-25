import type { ReactNode } from "react";

import MusicBannerCoverFix from "@/components/MusicBannerCoverFix";

export default function MusicLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <MusicBannerCoverFix />
    </>
  );
}
