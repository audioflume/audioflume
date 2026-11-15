import type { ReactNode } from "react";
import HomeExperimentSearch from "@/components/HomeExperimentSearch";

import "./pricing-page.css";
import "../home-page.css";

export default function PricingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="audioflume-pricing-route-shell">
      <HomeExperimentSearch />

      {children}
    </div>
  );
}
