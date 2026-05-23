"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import UploadIcon from "@/components/icons/UploadIcon";

type HeaderConfig = {
  section: string;
  label: string;
  action?: React.ReactNode;
  hideOriginalHeader?: boolean;
};

function getHeaderConfig(pathname: string): HeaderConfig | null {
  if (pathname === "/admin") {
    return {
      section: "Admin",
      label: "Dashboard",
      hideOriginalHeader: true,
      action: (
        <Link
          href="/admin/songs/new"
          className="hidden h-8 items-center justify-center gap-2 rounded-full border border-[var(--text-primary)] bg-[var(--text-primary)] px-3.5 text-xs font-medium text-[var(--bg-primary)] transition hover:opacity-80 md:flex"
        >
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
      hideOriginalHeader: false,
    };
  }

  return null;
}

function hasAccountWidthClasses(element: HTMLElement) {
  return element.classList.contains("mx-auto") && element.classList.contains("max-w-[1180px]");
}

function getDashboardContainer() {
  const main = document.querySelector("main");
  const section = main?.querySelector(":scope > section");
  const directChildren = Array.from(section?.children ?? []) as HTMLElement[];

  return directChildren.find(hasAccountWidthClasses) ?? null;
}

function getSongEditorContainer() {
  const card = document.querySelector<HTMLElement>(".admin-song-form-card");
  return card?.closest("main")?.querySelector<HTMLElement>(":scope > div") ?? null;
}

function getPageContainer(pathname: string) {
  if (pathname === "/admin") return getDashboardContainer();
  if (pathname.startsWith("/admin/songs")) return getSongEditorContainer();
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
      cleanupOriginal = config.hideOriginalHeader
        ? hideOriginalHeader(container)
        : undefined;
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
