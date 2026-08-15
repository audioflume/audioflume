"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Footer from "@/components/Footer";
import AdminAllPlaylistsView from "@/components/admin/AdminAllPlaylistsView";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminDiscoverLibraryView from "@/components/admin/AdminDiscoverLibraryView";
import AdminPlaylistLibraryView from "@/components/admin/AdminPlaylistLibraryView";
import PlusIcon from "@/components/icons/PlusIcon";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

type ManagerTab = "playlists" | "curated" | "discover";

export default function PlaylistManagerPage() {
  const searchParams = useSearchParams();
  const queryTab: ManagerTab =
    searchParams.get("tab") === "discover"
      ? "discover"
      : searchParams.get("tab") === "curated"
        ? "curated"
        : "playlists";

  const [activeTab, setActiveTab] = useState<ManagerTab>(queryTab);
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    setActiveTab(queryTab);
  }, [queryTab]);

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
        <div className="flex items-center gap-2">
          {(["playlists", "curated", "discover"] as ManagerTab[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`h-11 min-w-[104px] cursor-pointer rounded-[7px] border px-5 text-sm font-medium capitalize transition ${
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
          className="inline-flex h-11 min-w-[104px] cursor-pointer items-center justify-center gap-2 rounded-[7px] border border-[var(--text-primary)] bg-[var(--text-primary)] px-5 text-sm font-medium text-[var(--bg-primary)] transition"
        >
          <PlusIcon size={13} />
          <span>New Playlist</span>
        </Link>
      </div>

      <div className="grid gap-4 [&>section]:rounded-[10px] [&>section]:border [&>section]:border-[var(--border)] [&>section]:bg-[var(--bg-primary)] [&>section]:p-4 sm:[&>section]:p-5 [&>section+section]:!mt-0">
        {activeTab === "playlists" ? (
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
