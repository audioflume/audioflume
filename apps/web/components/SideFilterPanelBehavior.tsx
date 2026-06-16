"use client";

import { SideFilterPanelBehavior as SharedSideFilterPanelBehavior } from "@filmwave/shared";
import { useLayoutEffect } from "react";

const WEBSITE_FILTER_COUNT_ICON_STYLE_ID = "filmwave-website-filter-count-icon-parity";

function ensureWebsiteFilterCountIconParity() {
  if (typeof document === "undefined") return;
  if (document.getElementById(WEBSITE_FILTER_COUNT_ICON_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = WEBSITE_FILTER_COUNT_ICON_STYLE_ID;
  style.textContent = `
    body main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count:hover,
    body main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count.is-dot-only:hover {
      font-size: 0 !important;
    }

    body main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count.is-dot-only:hover .fw-filter-rail-count-check {
      opacity: 0 !important;
    }

    body main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count:hover::after,
    body main > section:has(.fw-filter-panel-wrap) .fw-filter-rail-count.is-dot-only:hover::after {
      content: "\\00d7" !important;
      position: static !important;
      top: auto !important;
      left: auto !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      width: 100% !important;
      height: 100% !important;
      font-family: inherit !important;
      font-size: 12px !important;
      font-weight: 450 !important;
      line-height: 1 !important;
      transform: translateY(-1px) !important;
    }
  `;

  document.head.appendChild(style);
}

export default function SideFilterPanelBehavior() {
  useLayoutEffect(() => {
    ensureWebsiteFilterCountIconParity();
  }, []);

  return <SharedSideFilterPanelBehavior />;
}
