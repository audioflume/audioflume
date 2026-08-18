"use client";

import ArtistCollaboratorsEditor from "@/components/artists/ArtistCollaboratorsEditor";
import ArtistSongEditor from "@/components/artists/ArtistSongEditor";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";

type ArtistSongEditorWithCollaboratorsProps = {
  artist: ArtistDashboardProfile;
  songId: string;
  onClose: () => void;
  onSaved: (song: { id: string; title: string }) => void;
};

export default function ArtistSongEditorWithCollaborators({
  artist,
  songId,
  onClose,
  onSaved,
}: ArtistSongEditorWithCollaboratorsProps) {
  return (
    <div className="grid gap-5">
      <ArtistSongEditor
        artist={artist}
        songId={songId}
        onClose={onClose}
        onSaved={onSaved}
      />
      <ArtistCollaboratorsEditor
        artistId={artist.id}
        resourceType="song"
        resourceId={songId}
        canEdit={artist.permissions.includes("catalog:edit")}
      />
    </div>
  );
}
