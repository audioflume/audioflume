import type { ReactNode } from "react";
import GlobalSearchBar from "@/components/GlobalSearchBar";

import "./pricing-page.css";

export default function PricingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="audioflume-pricing-route-shell">
      <GlobalSearchBar position="flow" />

      {children}
    </div>
  );
}
