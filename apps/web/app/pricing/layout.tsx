import type { ReactNode } from "react";
import Link from "next/link";

import GlobalSearchBar from "@/components/GlobalSearchBar";

import "./pricing-page.css";

export default function PricingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="audioflume-pricing-route-shell">
      <GlobalSearchBar
        position="flow"
        trailingContent={
          <Link href="/music?sort=recent">
            Most Recent
            <svg viewBox="0 0 12 12" aria-hidden="true">
              <path d="m3 4.5 3 3 3-3" />
            </svg>
          </Link>
        }
      />

      {children}
    </div>
  );
}
