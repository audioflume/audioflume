"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminDiscoverPlaylistForm from "@/components/admin/AdminDiscoverPlaylistForm";
import { secondaryPillButtonClass } from "@/components/uiClasses";

export default function EditDiscoverBlockPage() {
  const params = useParams();
  const playlistId = String(params.playlistId || "");

  return (
    <AdminContentPage
      label="Playlist Manager"
      title="Edit Discover Block"
      description="Update the content, image, and button for this fixed Discover slot."
      headerAction={(
        <Link href="/admin/playlist-manager?tab=discover" className={secondaryPillButtonClass}>
          Back to Manager
        </Link>
      )}
    >
      <AdminDiscoverPlaylistForm mode="edit" playlistId={playlistId} />
    </AdminContentPage>
  );
}
