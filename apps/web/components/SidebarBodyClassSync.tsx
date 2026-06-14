"use client";

import { useEffect } from "react";

const EXPANDED_SIDEBAR_WIDTH =
  "calc(var(--filmwave-sidebar-float-inset, 12px) + var(--filmwave-sidebar-panel-expanded-width) + var(--filmwave-sidebar-page-gap))";

const COLLAPSED_SIDEBAR_WIDTH =
  "calc(var(--filmwave-sidebar-float-inset, 12px) + var(--filmwave-sidebar-collapsed-panel-width) + var(--filmwave-sidebar-page-gap))";

export default function SidebarBodyClassSync() {
  useEffect(() => {
    let shellObserver: MutationObserver | null = null;
    let documentObserver: MutationObserver | null = null;
    let frame = 0;

    const syncSidebarClass = () => {
      const shell = document.querySelector<HTMLElement>(".desktop-app-shell");
      const collapsed = Boolean(shell?.classList.contains("is-sidebar-collapsed"));

      document.body.classList.toggle("sidebar-collapsed", collapsed);
      document.body.style.setProperty(
        "--filmwave-sidebar-current-panel-width",
        collapsed
          ? "var(--filmwave-sidebar-collapsed-panel-width)"
          : "var(--filmwave-sidebar-panel-expanded-width)",
      );
      document.body.style.setProperty(
        "--sidebar-width",
        collapsed ? COLLAPSED_SIDEBAR_WIDTH : EXPANDED_SIDEBAR_WIDTH,
      );

      if (!shell || shellObserver) return;

      shellObserver = new MutationObserver(syncSidebarClass);
      shellObserver.observe(shell, { attributes: true, attributeFilter: ["class"] });
    };

    syncSidebarClass();
    frame = window.requestAnimationFrame(syncSidebarClass);

    documentObserver = new MutationObserver(syncSidebarClass);
    documentObserver.observe(document.body, { childList: true, subtree: true });

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      shellObserver?.disconnect();
      documentObserver?.disconnect();
      document.body.classList.remove("sidebar-collapsed");
      document.body.style.removeProperty("--filmwave-sidebar-current-panel-width");
      document.body.style.removeProperty("--sidebar-width");
    };
  }, []);

  return null;
}
