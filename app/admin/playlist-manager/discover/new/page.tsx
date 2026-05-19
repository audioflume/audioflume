"use client";

import { useSearchParams } from "next/navigation";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminDiscoverPlaylistForm from "@/components/admin/AdminDiscoverPlaylistForm";
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
    <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
      <AdminSidebar />
      <div className="flex items-end justify-between gap-4 px-8 pt-14 pb-8">
        <div>
          <h1 className="font-[family-name:var(--font-instrument-sans)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
            Edit Discover Block
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Update the content, image, and button for this fixed Discover slot.
          </p>
        </div>
      </div>

      <div className="px-8 pb-8">
        <AdminDiscoverPlaylistForm
          mode="create"
          lockedDiscoverSection={lockedDiscoverSection}
        />
      </div>
    </main>
  );
}
