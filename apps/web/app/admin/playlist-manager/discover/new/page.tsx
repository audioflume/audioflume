"use client";

import Link from "next/link";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminDiscoverPlaylistForm from "@/components/admin/AdminDiscoverPlaylistForm";
import { secondaryPillButtonClass } from "@/components/uiClasses";
import { DISCOVER_LIBRARY_SECTION } from "@/lib/discoverAdmin";

export default function NewDiscoverContentPage() {
  return (
    <AdminContentPage
      label="Playlist Manager"
      title="New Discover Content"
      description="Create reusable Discover content, then assign it to a section from Playlist Manager."
      headerAction={(
        <Link href="/admin/playlist-manager?tab=discover" className={secondaryPillButtonClass}>
          Back to Manager
        </Link>
      )}
    >
      <AdminDiscoverPlaylistForm
        mode="create"
        lockedDiscoverSection={DISCOVER_LIBRARY_SECTION}
      />
    </AdminContentPage>
  );
}
