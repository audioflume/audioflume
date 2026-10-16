import type { ReactNode } from "react";
import Link from "next/link";

import GlobalMusicSearch from "@/components/GlobalMusicSearch";
import GlobalReferenceSearch from "@/components/GlobalReferenceSearch";

import "./pricing-page.css";

export default function PricingLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="audioflume-pricing-route-shell">
      <div className="audioflume-pricing-searchbar-slot">
        <div className="audioflume-pricing-searchbar">
          <Link
            href="/music?filters=open"
            className="audioflume-pricing-searchbar-filters"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 4v16M12 4v16M19 4v16M2 8h6M9 15h6M16 10h6" />
            </svg>
            <span>Filters</span>
          </Link>

          <GlobalMusicSearch />

          <div className="audioflume-pricing-searchbar-actions">
            <GlobalReferenceSearch className="audioflume-pricing-searchbar-song" />
            <Link href="/music?sort=recent" className="audioflume-pricing-searchbar-sort">
              Most Recent
              <svg viewBox="0 0 12 12" aria-hidden="true">
                <path d="m3 4.5 3 3 3-3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
