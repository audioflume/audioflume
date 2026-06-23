"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import {
  SidebarLinkRow,
  SidebarTooltip,
  type SidebarTooltipState,
} from "@filmwave/shared";

function CuratedIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7H13.25"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M5 12H15"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M5 17H11.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M17.4 4.9L18.18 6.74C18.32 7.07 18.58 7.33 18.91 7.47L20.75 8.25L18.91 9.03C18.58 9.17 18.32 9.43 18.18 9.76L17.4 11.6L16.62 9.76C16.48 9.43 16.22 9.17 15.89 9.03L14.05 8.25L15.89 7.47C16.22 7.33 16.48 7.07 16.62 6.74L17.4 4.9Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function SidebarCuratedLinkMount() {
  const pathname = usePathname();
  const router = useRouter();
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [tooltip, setTooltip] = useState<SidebarTooltipState>(null);

  useLayoutEffect(() => {
    const libraryNav = document.querySelector<HTMLElement>(
      ".desktop-app-sidebar-inner > .desktop-sidebar-section:first-child .desktop-sidebar-nav",
    );

    if (!libraryNav) return;

    let curatedMount = libraryNav.querySelector<HTMLElement>(
      ".desktop-sidebar-curated-mount",
    );

    if (!curatedMount) {
      curatedMount = document.createElement("div");
      curatedMount.className = "desktop-sidebar-curated-mount";
    }

    libraryNav.appendChild(curatedMount);
    setMount(curatedMount);

    const shell = document.querySelector<HTMLElement>(".desktop-app-shell");
    const updateCollapsed = () => {
      setCollapsed(Boolean(shell?.classList.contains("is-sidebar-collapsed")));
    };

    updateCollapsed();

    const observer = shell ? new MutationObserver(updateCollapsed) : null;
    observer?.observe(shell, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer?.disconnect();
      setTooltip(null);
    };
  }, []);

  if (!mount) return null;

  const active =
    pathname === "/curated-playlists" ||
    pathname.startsWith("/curated-playlists/");

  return (
    <>
      {createPortal(
        <SidebarLinkRow
          label="Curated Playlists"
          icon={<CuratedIcon />}
          collapsed={collapsed}
          active={active}
          onTooltipChange={setTooltip}
          onClick={() => router.push("/curated-playlists")}
        />,
        mount,
      )}
      {tooltip && <SidebarTooltip label={tooltip.label} top={tooltip.top} />}
    </>
  );
}
