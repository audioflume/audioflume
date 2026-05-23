"use client";

import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

type HeaderConfig = {
  section: string;
  label: string;
};

function getHeaderConfig(pathname: string): HeaderConfig | null {
  if (pathname.startsWith("/admin/songs") && !pathname.includes("/edit-points")) {
    return {
      section: "Admin",
      label: "Song Editor",
    };
  }

  return null;
}

function getSongEditorContainer() {
  return document.querySelector<HTMLElement>("main > div.px-8");
}

function ensureMount(container: HTMLElement) {
  const existing = container.querySelector<HTMLElement>(":scope > .admin-page-header-mount");
  if (existing) return existing;

  const mount = document.createElement("div");
  mount.className = "admin-page-header-mount";
  container.insertBefore(mount, container.firstChild);
  return mount;
}

export default function AdminPageHeaderMount() {
  const pathname = usePathname();
  const config = useMemo(() => getHeaderConfig(pathname), [pathname]);
  const [mount, setMount] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (!config) {
      setMount(null);
      return;
    }

    let cancelled = false;
    let frame = 0;
    let observer: MutationObserver | null = null;

    function sync() {
      if (cancelled) return;

      const container = getSongEditorContainer();

      if (container) {
        setMount(ensureMount(container));
      }

      frame = window.requestAnimationFrame(sync);
    }

    sync();

    observer = new MutationObserver(() => {
      if (cancelled) return;

      const container = getSongEditorContainer();

      if (container) {
        setMount(ensureMount(container));
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      setMount(null);
    };
  }, [config, pathname]);

  if (!config || !mount) return null;

  return createPortal(
    <AdminPageHeader section={config.section} label={config.label} />,
    mount,
  );
}
