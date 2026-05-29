"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminDiscoverPlaylistForm from "@/components/admin/AdminDiscoverPlaylistForm";
import { secondaryPillButtonClass } from "@/components/uiClasses";
import { DISCOVER_SECTION_OPTIONS } from "@/lib/curatedPlaylists";

function getLockedDiscoverSection(section: string | null) {
  if (
    section &&
    DISCOVER_SECTION_OPTIONS.some((option) => option.value === section)
  ) {
    return section;
  }

  return undefined;
}

export default function NewDiscoverBlockPage() {
  const searchParams = useSearchParams();
  const lockedDiscoverSection = getLockedDiscoverSection(
    searchParams.get("section"),
  );

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
      <AdminDiscoverPlaylistForm
        mode="create"
        lockedDiscoverSection={lockedDiscoverSection}
      />
    </AdminContentPage>
  );
}
