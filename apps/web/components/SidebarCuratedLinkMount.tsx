"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import {
  SidebarLinkRow,
  SidebarNav,
  SidebarTooltip,
  type SidebarTooltipState,
} from "@filmwave/shared";

function CuratedIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 4.25H8.7M3 7H10.1M3 9.75H7.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10.45 2.4L10.8 3.2C10.9 3.43 11.08 3.61 11.31 3.71L12.1 4.05L11.31 4.39C11.08 4.49 10.9 4.67 10.8 4.9L10.45 5.7L10.1 4.9C10 4.67 9.82 4.49 9.59 4.39L8.8 4.05L9.59 3.71C9.82 3.61 10 3.43 10.1 3.2L10.45 2.4Z"
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
    const sidebarInner = document.querySelector<HTMLElement>(
      ".desktop-app-sidebar-inner",
    );
    const projectsSection = document.querySelector<HTMLElement>(
      ".desktop-sidebar-section.is-projects-section",
    );

    if (!sidebarInner || !projectsSection) return;

    let curatedMount = sidebarInner.querySelector<HTMLElement>(
      ".desktop-sidebar-curated-mount",
    );

    if (!curatedMount) {
      curatedMount = document.createElement("div");
      curatedMount.className = "desktop-sidebar-curated-mount";
      sidebarInner.insertBefore(curatedMount, projectsSection);
    }

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
        <SidebarNav label="Curated playlists navigation">
          <SidebarLinkRow
            label="Curated Playlists"
            icon={<CuratedIcon />}
            collapsed={collapsed}
            active={active}
            onTooltipChange={setTooltip}
            onClick={() => router.push("/curated-playlists")}
          />
        </SidebarNav>,
        mount,
      )}
      {tooltip && <SidebarTooltip label={tooltip.label} top={tooltip.top} />}
    </>
  );
}
