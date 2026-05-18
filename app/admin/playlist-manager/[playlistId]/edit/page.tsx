"use client";

import { useParams } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminCuratedPlaylistForm from "@/components/admin/AdminCuratedPlaylistForm";

export default function EditPlaylistPage() {
  const params = useParams();
  const playlistId = String(params.playlistId || "");

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
      <AdminSidebar />
      <div className="flex items-end justify-between gap-4 px-8 pt-14 pb-8">
        <div>
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
            Edit Playlist
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Update metadata, cover image, group, or song list.
          </p>
        </div>
      </div>
      <div className="px-8 pb-8">
        <AdminCuratedPlaylistForm mode="edit" playlistId={playlistId} />
      </div>
    </main>
  );
}
