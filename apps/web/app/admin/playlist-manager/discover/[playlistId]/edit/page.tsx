"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminDiscoverPlaylistForm from "@/components/admin/AdminDiscoverPlaylistForm";
import { backendSecondaryButtonClass } from "@/components/backend/backendClasses";

export default function EditDiscoverContentPage() {
  const params = useParams();
  const playlistId = String(params.playlistId || "");

  return (
    <AdminContentPage
      label="Playlist Manager"
      title="Edit Discover Content"
      description="Update this reusable Discover item. Section placement is managed from Playlist Manager."
      headerAction={(
        <Link href="/admin/playlist-manager?tab=discover" className={backendSecondaryButtonClass}>
          Back to Manager
        </Link>
      )}
    >
      <AdminDiscoverPlaylistForm mode="edit" playlistId={playlistId} />
    </AdminContentPage>
  );
}
