"use client";

import ArtistCollaboratorsEditor from "@/components/artists/ArtistCollaboratorsEditor";
import ArtistSongAudioReplacement from "@/components/artists/ArtistSongAudioReplacement";
import ArtistSongEditor from "@/components/artists/ArtistSongEditor";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";

type ArtistSongSummary = {
  id: string;
  title: string;
  status: string;
  duration: number;
  bpm?: number | null;
  key?: string | null;
  created_at: string;
};

type ArtistSongEditorWithCollaboratorsProps = {
  artist: ArtistDashboardProfile;
  song: ArtistSongSummary;
  onClose: () => void;
  onSaved: (
    song: { id: string; title: string },
    revisionPending?: boolean,
  ) => void;
};

export default function ArtistSongEditorWithCollaborators({
  artist,
  song,
  onClose,
  onSaved,
}: ArtistSongEditorWithCollaboratorsProps) {
  return (
    <div className="grid gap-5">
      <ArtistSongEditor
        artist={artist}
        songId={song.id}
        onClose={onClose}
        onSaved={onSaved}
      />
      <ArtistSongAudioReplacement
        artist={artist}
        song={song}
        onClose={onClose}
        embedded
        onReplaced={(updatedSong, _resetForReview, revisionPending) =>
          onSaved(
            { id: updatedSong.id, title: updatedSong.title },
            revisionPending,
          )
        }
      />
      <ArtistCollaboratorsEditor
        artistId={artist.id}
        resourceType="song"
        resourceId={song.id}
        canEdit={artist.permissions.includes("catalog:edit")}
      />
    </div>
  );
}
