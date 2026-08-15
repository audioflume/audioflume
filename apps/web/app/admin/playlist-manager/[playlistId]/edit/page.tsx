"use client";

import { useParams } from "next/navigation";
import Footer from "@/components/Footer";
import AdminContentPage from "@/components/admin/AdminContentPage";
import AdminCuratedPlaylistForm from "@/components/admin/AdminCuratedPlaylistForm";
import AdminPlaylistPageStyles from "@/components/admin/AdminPlaylistPageStyles";

export default function EditPlaylistPage() {
  const params = useParams();
  const playlistId = String(params.playlistId || "");

  return (
    <AdminContentPage
      label="Edit Playlist"
      title="Edit Playlist"
      description="Update metadata, cover image or video, group, or song list."
      contentAreaBottomPadding={false}
    >
      <AdminCuratedPlaylistForm mode="edit" playlistId={playlistId} />
      <AdminPlaylistPageStyles />
      <Footer className="!px-0" playerPadding={false} showTopBorder={false} />
    </AdminContentPage>
  );
}
