"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import AdminAllPlaylistsView from "@/components/admin/AdminAllPlaylistsView";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminDiscoverLibraryView from "@/components/admin/AdminDiscoverLibraryView";
import AdminPlaylistLibraryView from "@/components/admin/AdminPlaylistLibraryView";
import PlusIcon from "@/components/icons/PlusIcon";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

type ManagerTab = "playlists" | "curated" | "discover";

const PLAYLIST_MANAGER_TAB_STORAGE_KEY = "audioflume-admin-playlist-manager-tab";

function isManagerTab(value: string | null): value is ManagerTab {
  return value === "playlists" || value === "curated" || value === "discover";
}

export default function PlaylistManagerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const queryTab: ManagerTab | null = isManagerTab(tabParam) ? tabParam : null;

  const [activeTab, setActiveTab] = useState<ManagerTab | null>(queryTab);
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    if (queryTab) {
      setActiveTab(queryTab);
      window.localStorage.setItem(PLAYLIST_MANAGER_TAB_STORAGE_KEY, queryTab);
      return;
    }

    const storedTab = window.localStorage.getItem(PLAYLIST_MANAGER_TAB_STORAGE_KEY);
    setActiveTab(isManagerTab(storedTab) ? storedTab : "playlists");
  }, [queryTab]);

  const selectTab = (tab: ManagerTab) => {
    setActiveTab(tab);
    window.localStorage.setItem(PLAYLIST_MANAGER_TAB_STORAGE_KEY, tab);
    router.replace(`/admin/playlist-manager?tab=${tab}`, { scroll: false });
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch("/api/admin/curated-playlists");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data?.error || "Failed to load playlists");
        }

        if (!cancelled) {
          setPlaylists(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function deletePlaylist(playlist: CuratedPlaylist) {
    const confirmed = window.confirm(`Delete "${playlist.name}"?`);
    if (!confirmed) return;

    try {
      setDeletingId(playlist.id);

      const res = await fetch(`/api/admin/curated-playlists/${playlist.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.error || "Failed to delete playlist");

      setPlaylists((current) =>
        current.filter((item) => item.id !== playlist.id),
      );
    } catch (err) {
      window.alert(
        err instanceof Error ? err.message : "Failed to delete playlist",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <AdminContentPage
      label="Playlist Manager"
      title="Playlist Manager"
      description="Manage the playlist library, curated shelves, and Discover content."
      compactHeader
      contentAreaClassName="bg-[var(--filmwave-neutral-surface)]"
      contentAreaBottomPadding={false}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className={`flex items-center gap-2 ${activeTab === null ? "invisible" : ""}`}>
          {(["playlists", "curated", "discover"] as ManagerTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => selectTab(tab)}
              className={`h-10 min-w-[104px] cursor-pointer rounded-[7px] border px-5 text-[12px] font-normal transition ${
                activeTab === tab
                  ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]"
                  : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {tab === "playlists"
                ? "All Playlists"
                : tab === "curated"
                  ? "Curated"
                  : "Discover"}
            </button>
          ))}
        </div>

        <Link
          href="/admin/playlist-manager/new"
          className="inline-flex h-10 min-w-[104px] cursor-pointer items-center justify-center gap-2 rounded-[7px] border border-[var(--text-primary)] bg-[var(--text-primary)] px-5 text-[12px] font-normal text-[var(--bg-primary)] transition"
        >
          <PlusIcon size={13} />
          <span>New Playlist</span>
        </Link>
      </div>

      <div className="grid gap-3 [&>section]:rounded-[10px] [&>section]:border [&>section]:border-[var(--border)] [&>section]:bg-[var(--bg-primary)] [&>section]:p-4 sm:[&>section]:p-5 [&>section+section]:!mt-0">
        {activeTab === null ? null : activeTab === "playlists" ? (
          <AdminAllPlaylistsView
            playlists={playlists}
            loading={loading}
            error={error}
            deletingId={deletingId}
            onDeletePlaylist={deletePlaylist}
          />
        ) : activeTab === "curated" ? (
          <AdminPlaylistLibraryView
            playlists={playlists}
            loading={loading}
            error={error}
          />
        ) : (
          <AdminDiscoverLibraryView
            playlists={playlists}
            loading={loading}
            error={error}
          />
        )}
      </div>

      <Footer className="!px-0" playerPadding={false} showTopBorder={false} />
    </AdminContentPage>
  );
}