import type { ReactNode } from "react";
import SuggestedForYouPortal from "./SuggestedForYouPortal";

export default function DiscoverTemplate({ children }: { children: ReactNode }) {
  return (
    <>
      <SuggestedForYouPortal />
      {children}
    </>
  );
}
