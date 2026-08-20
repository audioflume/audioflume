"use client";

import { useCallback, useState } from "react";

import ArtistCollaboratorsEditor from "@/components/artists/ArtistCollaboratorsEditor";
import ArtistSongEditFiles, {
  type ArtistSongCurrentRelease,
} from "@/components/artists/ArtistSongEditFiles";
import ArtistSongEditor from "@/components/artists/ArtistSongEditor";
import { BackendSelect } from "@/components/backend/BackendControls";
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
  const [currentRelease, setCurrentRelease] =
    useState<ArtistSongCurrentRelease | null>(null);
  const handleReleaseLoaded = useCallback(
    (release: ArtistSongCurrentRelease | null) => setCurrentRelease(release),
    [],
  );

  return (
    <ArtistSongEditor
      artist={artist}
      songId={song.id}
      onClose={onClose}
      onSaved={onSaved}
      beforeContent={
        <ArtistSongEditFiles
          artist={artist}
          songId={song.id}
          onReleaseLoaded={handleReleaseLoaded}
          onRevisionPending={() =>
            onSaved({ id: song.id, title: song.title }, true)
          }
        />
      }
      songInfoExtra={
        <div>
          <BackendSelect
            aria-label="Release"
            value={currentRelease?.id ?? ""}
            onChange={() => undefined}
            className={`filmwave-backend-select-end-control ${
              currentRelease
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-muted)]"
            }`}
          >
            <option value={currentRelease?.id ?? ""}>
              {currentRelease?.title ?? "Not part of a release"}
            </option>
          </BackendSelect>
        </div>
      }
      afterContent={
        <ArtistCollaboratorsEditor
          artistId={artist.id}
          resourceType="song"
          resourceId={song.id}
          canEdit={artist.permissions.includes("catalog:edit")}
        />
      }
    />
  );
}