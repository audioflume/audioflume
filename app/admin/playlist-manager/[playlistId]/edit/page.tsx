"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminCuratedPlaylistForm from "@/components/admin/AdminCuratedPlaylistForm";
import { secondaryPillButtonClass } from "@/components/uiClasses";

export default function EditPlaylistPage() {
  const params = useParams();
  const playlistId = String(params.playlistId || "");

  return (
    <AdminContentPage
      label="Playlist Manager"
      title="Edit Playlist"
      description="Update metadata, cover image, group, or song list."
      headerAction={(
        <Link href="/admin/playlist-manager" className={secondaryPillButtonClass}>
          Back to Manager
        </Link>
      )}
    >
      <AdminCuratedPlaylistForm mode="edit" playlistId={playlistId} />
    </AdminContentPage>
  );
}
