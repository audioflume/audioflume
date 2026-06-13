"use client";

import { useEffect } from "react";

export default function SidebarBodyClassSync() {
  useEffect(() => {
    const shell = document.querySelector<HTMLElement>(".desktop-app-shell");

    const syncSidebarClass = () => {
      const collapsed = Boolean(shell?.classList.contains("is-sidebar-collapsed"));
      document.body.classList.toggle("sidebar-collapsed", collapsed);
    };

    syncSidebarClass();

    if (!shell) return undefined;

    const observer = new MutationObserver(syncSidebarClass);
    observer.observe(shell, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
    };
  }, []);

  return null;
}
