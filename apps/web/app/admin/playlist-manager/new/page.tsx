"use client";

import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminCuratedPlaylistForm from "@/components/admin/AdminCuratedPlaylistForm";
import AdminPlaylistPageStyles from "@/components/admin/AdminPlaylistPageStyles";

export default function NewPlaylistPage() {
  return (
    <AdminContentPage
      label="Create Playlist"
      title="Create Playlist"
      description="Add a new curated playlist with cover image or video and group assignment."
    >
      <AdminCuratedPlaylistForm mode="create" />
      <AdminPlaylistPageStyles />
    </AdminContentPage>
  );
}
