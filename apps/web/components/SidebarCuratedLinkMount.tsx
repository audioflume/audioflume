"use client";

import { useEffect, useState } from "react";
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
      width="19"
      height="19"
      viewBox="0.4 0.4 13.2 13.2"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.15 3.1H9.2C9.9 3.1 10.45 3.65 10.45 4.35V9.4C10.45 10.1 9.9 10.65 9.2 10.65H4.15C3.45 10.65 2.9 10.1 2.9 9.4V4.35C2.9 3.65 3.45 3.1 4.15 3.1Z"
        stroke="currentColor"
        strokeWidth="1.45"
      />
      <path
        d="M4.35 1.75H9.85C11.15 1.75 12.25 2.85 12.25 4.15V8.95"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M6.65 5.05L7.05 5.9C7.14 6.1 7.3 6.26 7.5 6.35L8.35 6.75L7.5 7.15C7.3 7.24 7.14 7.4 7.05 7.6L6.65 8.45L6.25 7.6C6.16 7.4 6 7.24 5.8 7.15L4.95 6.75L5.8 6.35C6 6.26 6.16 6.1 6.25 5.9L6.65 5.05Z"
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

  useEffect(() => {
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
