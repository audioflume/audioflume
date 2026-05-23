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
  const card = document.querySelector<HTMLElement>(".admin-song-form-card");
  return card?.closest("main")?.querySelector<HTMLElement>(":scope > div") ?? null;
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

    let frame = 0;

    function sync() {
      const container = getSongEditorContainer();
      if (!container) return;

      setMount(ensureMount(container));
    }

    sync();
    frame = window.requestAnimationFrame(sync);

    return () => {
      window.cancelAnimationFrame(frame);
      setMount(null);
    };
  }, [config, pathname]);

  if (!config || !mount) return null;

  return createPortal(
    <AdminPageHeader section={config.section} label={config.label} />,
    mount,
  );
}
