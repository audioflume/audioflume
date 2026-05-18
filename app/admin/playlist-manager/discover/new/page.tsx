"use client";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminDiscoverPlaylistForm from "@/components/admin/AdminDiscoverPlaylistForm";

export default function NewDiscoverBlockPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
      <AdminSidebar />
      <div className="px-5 py-6 md:px-8 lg:px-10">
        <div className="mb-6">
          <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
            Playlist Manager / Discover
          </div>
          <h1 className="mt-2 font-[family-name:var(--font-instrument-sans)] text-[clamp(34px,5vw,58px)] font-medium leading-none tracking-[-0.07em]">
            Create Discover Block
          </h1>
        </div>
        <AdminDiscoverPlaylistForm mode="create" />
      </div>
    </main>
  );
}
