"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import PlusIcon from "@/components/icons/PlusIcon";
import UploadIcon from "@/components/icons/UploadIcon";

type HideMode = "first-child" | "all-children" | "none";

type HeaderConfig = {
  section: string;
  label: string;
  action?: React.ReactNode;
  hideMode: HideMode;
};

const adminPrimaryButtonClass =
  "hidden h-8 items-center justify-center gap-2 rounded-full border border-[var(--text-primary)] bg-[var(--text-primary)] px-3.5 text-xs font-medium text-[var(--bg-primary)] transition hover:opacity-80 md:flex";

const adminSecondaryButtonClass =
  "hidden h-8 items-center justify-center rounded-full border border-[var(--border)] px-3.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)] md:flex";

function getSongIdFromCuePointPath(pathname: string) {
  const match = pathname.match(/^\/admin\/songs\/([^/]+)\/edit-points/);
  return match?.[1] ?? null;
}

function getHeaderConfig(pathname: string): HeaderConfig | null {
  const cuePointSongId = getSongIdFromCuePointPath(pathname);

  if (pathname === "/admin") {
    return {
      section: "Admin",
      label: "Dashboard",
      hideMode: "first-child",
      action: (
        <Link href="/admin/songs/new" className={adminPrimaryButtonClass}>
          <UploadIcon size={13} />
          <span>Upload Song</span>
        </Link>
      ),
    };
  }

  if (pathname === "/admin/music-library") {
    return {
      section: "Admin",
      label: "Music Library",
      hideMode: "first-child",
      action: (
        <Link href="/admin/songs/new" className={adminPrimaryButtonClass}>
          <UploadIcon size={13} />
          <span>Upload Song</span>
        </Link>
      ),
    };
  }

  if (pathname === "/admin/playlist-manager") {
    return {
      section: "Admin",
      label: "Playlist Manager",
      hideMode: "all-children",
      action: (
        <Link href="/admin/playlist-manager/new" className={adminPrimaryButtonClass}>
          <PlusIcon size={13} />
          <span>New Playlist</span>
        </Link>
      ),
    };
  }

  if (pathname === "/admin/edit-points") {
    return {
      section: "Admin",
      label: "Cue Points",
      hideMode: "first-child",
      action: (
        <Link href="/admin/music-library?issue=editPoints" className={adminSecondaryButtonClass}>
          View Missing
        </Link>
      ),
    };
  }

  if (cuePointSongId) {
    return {
      section: "Admin",
      label: "Cue Points",
      hideMode: "none",
      action: (
        <Link href={`/admin/songs/${cuePointSongId}/edit`} className={adminSecondaryButtonClass}>
          Edit Details
        </Link>
      ),
    };
  }

  if (pathname.startsWith("/admin/songs")) {
    return {
      section: "Admin",
      label: "Song Editor",
      hideMode: "none",
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

function getSongCuePointContainer() {
  return document.querySelector<HTMLElement>("main > div");
}

function getMainSectionContainer() {
  return document.querySelector<HTMLElement>("main > section");
}

function getPlaylistManagerContainer() {
  const main = document.querySelector("main");
  const directChildren = Array.from(main?.children ?? []) as HTMLElement[];

  return (
    directChildren.find(
      (child) =>
        child.tagName.toLowerCase() === "div" &&
        child.className.includes("pt-14") &&
        child.className.includes("pb-6"),
    ) ?? null
  );
}

function getPageContainer(pathname: string) {
  if (pathname === "/admin") return getDashboardContainer();
  if (pathname === "/admin/music-library") return getMainSectionContainer();
  if (pathname === "/admin/playlist-manager") return getPlaylistManagerContainer();
  if (pathname === "/admin/edit-points") return getMainSectionContainer();
  if (getSongIdFromCuePointPath(pathname)) return getSongCuePointContainer();
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

function hideOriginalHeader(container: HTMLElement, hideMode: HideMode) {
  if (hideMode === "none") return undefined;

  const children = Array.from(container.children) as HTMLElement[];
  const candidates = children.filter(
    (child) => !child.classList.contains("admin-page-header-mount"),
  );
  const hiddenChildren = hideMode === "all-children" ? candidates : candidates.slice(0, 1);

  hiddenChildren.forEach((child) => {
    child.classList.add("admin-original-page-header-hidden");
  });

  return () => {
    hiddenChildren.forEach((child) => {
      child.classList.remove("admin-original-page-header-hidden");
    });
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
      cleanupOriginal = hideOriginalHeader(container, config.hideMode);
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
