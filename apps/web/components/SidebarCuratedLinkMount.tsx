"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname, useRouter } from "next/navigation";
import {
  SidebarLinkRow,
  SidebarTooltip,
  type SidebarTooltipState,
} from "@filmwave/shared";
import CuratedPlaylistsIcon from "@/components/icons/CuratedPlaylistsIcon";

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
          icon={<CuratedPlaylistsIcon size={20} />}
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
