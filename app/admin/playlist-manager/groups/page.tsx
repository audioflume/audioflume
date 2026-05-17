"use client";

import Link from "next/link";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminPlaylistGroupManager from "@/components/admin/AdminPlaylistGroupManager";
import { secondaryPillButtonClass } from "@/components/uiClasses";

export default function PlaylistGroupsPage() {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
      <AdminSidebar />

      <div className="px-5 py-6 md:px-8 lg:px-10">
        <section className="mb-6 flex flex-col gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-secondary)] p-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Playlist Manager
            </div>
            <h1 className="mt-2 font-[family-name:var(--font-instrument-sans)] text-[clamp(34px,5vw,58px)] font-medium leading-none tracking-[-0.07em]">
              Playlist Groups
            </h1>
            <p className="mt-3 max-w-[620px] text-sm leading-6 text-[var(--text-secondary)]">
              Create, edit, and delete the group rows used to organize curated playlists on the public page.
            </p>
          </div>

          <Link href="/admin/playlist-manager" className={secondaryPillButtonClass}>
            Back to playlists
          </Link>
        </section>

        <AdminPlaylistGroupManager />
      </div>
    </main>
  );
}
