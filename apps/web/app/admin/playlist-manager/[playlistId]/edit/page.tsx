"use client";

import { useParams } from "next/navigation";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminCuratedPlaylistForm from "@/components/admin/AdminCuratedPlaylistForm";
import AdminEditPageStyles from "@/components/admin/AdminEditPageStyles";

export default function EditPlaylistPage() {
  const params = useParams();
  const playlistId = String(params.playlistId || "");

  return (
    <AdminContentPage
      label="Edit Playlist"
      title="Edit Playlist"
      description="Update metadata, cover image or video, group, or song list."
    >
      <AdminCuratedPlaylistForm mode="edit" playlistId={playlistId} />
      <AdminEditPageStyles />
    </AdminContentPage>
  );
}
