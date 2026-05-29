"use client";

import Link from "next/link";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminCuratedPlaylistForm from "@/components/admin/AdminCuratedPlaylistForm";
import { secondaryPillButtonClass } from "@/components/uiClasses";

export default function NewPlaylistPage() {
  return (
    <AdminContentPage
      label="Playlist Manager"
      title="Create Playlist"
      description="Add a new curated playlist with cover image and group assignment."
      headerAction={(
        <Link href="/admin/playlist-manager" className={secondaryPillButtonClass}>
          Back to Manager
        </Link>
      )}
    >
      <AdminCuratedPlaylistForm mode="create" />
    </AdminContentPage>
  );
}
