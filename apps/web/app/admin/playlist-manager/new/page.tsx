"use client";

import Footer from "@/components/Footer";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminCuratedPlaylistForm from "@/components/admin/AdminCuratedPlaylistForm";
import AdminPlaylistPageStyles from "@/components/admin/AdminPlaylistPageStyles";

export default function NewPlaylistPage() {
  return (
    <AdminContentPage
      label="Create Playlist"
      title="Create Playlist"
      description="Add a new curated playlist with cover image or video and group assignment."
      contentAreaBottomPadding={false}
    >
      <AdminCuratedPlaylistForm mode="create" />
      <AdminPlaylistPageStyles />
      <Footer className="!px-0" playerPadding={false} showTopBorder={false} />
    </AdminContentPage>
  );
}
