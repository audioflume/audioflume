"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminDiscoverLibraryView from "@/components/admin/AdminDiscoverLibraryView";
import AdminPlaylistLibraryView from "@/components/admin/AdminPlaylistLibraryView";
import type { CuratedPlaylist } from "@/lib/curatedPlaylists";

type ManagerTab = "playlists" | "discover";

type PlaylistUpdate = {
  id: number;
  changes: Partial<CuratedPlaylist>;
};

export default function PlaylistManagerPage() {
  const searchParams = useSearchParams();
  const queryTab: ManagerTab =
    searchParams.get("tab") === "discover" ? "discover" : "playlists";

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

  function updatePlaylists(updates: PlaylistUpdate[]) {
    if (updates.length === 0) return;

    const updateMap = new Map(
      updates.map((update) => [update.id, update.changes] as const),
    );

    setPlaylists((current) =>
      current.map((playlist) => {
        const changes = updateMap.get(playlist.id);
        return changes ? { ...playlist, ...changes } : playlist;
      }),
    );
  }

  async function deletePlaylist(playlist: CuratedPlaylist) {
    const confirmed = window.confirm(`Delete \"${playlist.name}\"?`);
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

  const masterPlaylists = playlists.filter(
    (playlist) => !playlist.discover_section,
  );

  return (
    <AdminContentPage
      label="Playlist Manager"
      title="Playlist Manager"
      description="Manage the playlist library, curated shelves, and Discover content."
    >
      <div className="mb-7 flex items-center gap-2">
        {(["playlists", "discover"] as ManagerTab[]).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`h-9 rounded-[14px] border px-4 text-xs font-medium capitalize transition ${
              activeTab === tab
                ? "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)]"
                : "border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            {tab === "playlists" ? "Playlists" : "Discover"}
          </button>
        ))}
      </div>

      {activeTab === "playlists" ? (
        <AdminPlaylistLibraryView
          playlists={masterPlaylists}
          loading={loading}
          error={error}
          deletingId={deletingId}
          onDeletePlaylist={deletePlaylist}
        />
      ) : (
        <AdminDiscoverLibraryView
          playlists={playlists}
          loading={loading}
          error={error}
          deletingId={deletingId}
          onDeletePlaylist={deletePlaylist}
          onUpdatePlaylists={updatePlaylists}
        />
      )}
    </AdminContentPage>
  );
}
