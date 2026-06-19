"use client";

import { useEffect } from "react";

export default function SidebarBodyClassSync() {
  useEffect(() => {
    let shellObserver: MutationObserver | null = null;
    let documentObserver: MutationObserver | null = null;
    let frame = 0;

    const syncSidebarClass = () => {
      const shell = document.querySelector<HTMLElement>(".desktop-app-shell");
      const collapsed = Boolean(shell?.classList.contains("is-sidebar-collapsed"));

      document.body.classList.toggle("sidebar-collapsed", collapsed);

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
    };
  }, []);

  return null;
}
