"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import UploadIcon from "@/components/icons/UploadIcon";
import { primaryPillButtonClass } from "@/components/uiClasses";

type HeaderConfig = {
  section: string;
  label: string;
  action?: React.ReactNode;
};

function getHeaderConfig(pathname: string): HeaderConfig | null {
  if (pathname === "/admin") {
    return {
      section: "Admin",
      label: "Dashboard",
      action: (
        <Link href="/admin/songs/new" className={`${primaryPillButtonClass} hidden md:flex`}>
          <UploadIcon size={13} />
          <span>Upload Song</span>
        </Link>
      ),
    };
  }

  if (pathname.startsWith("/admin/songs")) {
    return {
      section: "Admin",
      label: "Song Editor",
    };
  }

  return null;
}

function getPageContainer(pathname: string) {
  if (pathname === "/admin") {
    return document.querySelector<HTMLElement>("main > section > div.mx-auto.max-w-[1180px]");
  }

  if (pathname.startsWith("/admin/songs")) {
    const card = document.querySelector<HTMLElement>(".admin-song-form-card");
    return card?.closest("main")?.querySelector<HTMLElement>(":scope > div") ?? null;
  }

  return null;
}

function ensureMount(container: HTMLElement) {
  const existing = container.querySelector<HTMLElement>(":scope > .admin-page-header-mount");
  if (existing) return existing;

  const mount = document.createElement("div");
  mount.className = "admin-page-header-mount";
  container.insertBefore(mount, container.firstChild);
  return mount;
}

function hideOriginalHeader(container: HTMLElement) {
  const children = Array.from(container.children) as HTMLElement[];
  const originalHeader = children.find((child) => !child.classList.contains("admin-page-header-mount"));
  originalHeader?.classList.add("admin-original-page-header-hidden");

  return () => {
    originalHeader?.classList.remove("admin-original-page-header-hidden");
  };
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

    let cleanupOriginal: (() => void) | undefined;
    let frame = 0;

    function sync() {
      const container = getPageContainer(pathname);
      if (!container) return;

      const nextMount = ensureMount(container);
      cleanupOriginal?.();
      cleanupOriginal = hideOriginalHeader(container);
      setMount(nextMount);
    }

    sync();
    frame = window.requestAnimationFrame(sync);

    return () => {
      window.cancelAnimationFrame(frame);
      cleanupOriginal?.();
      setMount(null);
    };
  }, [config, pathname]);

  if (!config || !mount) return null;

  return createPortal(
    <AdminPageHeader section={config.section} label={config.label} action={config.action} />,
    mount,
  );
}
