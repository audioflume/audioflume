"use client";

import { useCallback, useEffect, useState } from "react";

import ArtistCollaboratorsEditor from "@/components/artists/ArtistCollaboratorsEditor";
import ArtistSongEditFiles, {
  type ArtistSongCurrentRelease,
} from "@/components/artists/ArtistSongEditFiles";
import ArtistSongEditor from "@/components/artists/ArtistSongEditor";
import ArtistSongLicenseSelector, {
  type ArtistSongLicenseType,
} from "@/components/artists/ArtistSongLicenseSelector";
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

type LicenseResponse = {
  license_type?: ArtistSongLicenseType;
  revision_pending?: boolean;
  error?: string;
};

export default function ArtistSongEditorWithCollaborators({
  artist,
  song,
  onClose,
  onSaved,
}: ArtistSongEditorWithCollaboratorsProps) {
  const [currentRelease, setCurrentRelease] =
    useState<ArtistSongCurrentRelease | null>(null);
  const [licenseType, setLicenseType] =
    useState<ArtistSongLicenseType>("premium");
  const [savedLicenseType, setSavedLicenseType] =
    useState<ArtistSongLicenseType>("premium");
  const [licenseLoading, setLicenseLoading] = useState(true);
  const [licenseSaving, setLicenseSaving] = useState(false);
  const [licenseError, setLicenseError] = useState("");
  const canEditLicense = artist.permissions.includes("catalog:edit");

  const handleReleaseLoaded = useCallback(
    (release: ArtistSongCurrentRelease | null) => setCurrentRelease(release),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setLicenseLoading(true);
    setLicenseError("");

    void fetch(`/api/artists/${artist.id}/songs/${song.id}/license`, {
      cache: "no-store",
    })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as LicenseResponse;
        if (!response.ok || !body.license_type) {
          throw new Error(body.error || "Failed to load track license");
        }
        if (!cancelled) {
          setLicenseType(body.license_type);
          setSavedLicenseType(body.license_type);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLicenseError(
            error instanceof Error ? error.message : "Failed to load track license",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLicenseLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artist.id, song.id]);

  const handleSaved = useCallback(
    (savedSong: { id: string; title: string }, revisionPending = false) => {
      if (!canEditLicense || licenseLoading || licenseType === savedLicenseType) {
        onSaved(savedSong, revisionPending);
        return;
      }

      setLicenseSaving(true);
      setLicenseError("");

      void fetch(`/api/artists/${artist.id}/songs/${song.id}/license`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ license_type: licenseType }),
      })
        .then(async (response) => {
          const body = (await response.json().catch(() => ({}))) as LicenseResponse;
          if (!response.ok || !body.license_type) {
            throw new Error(body.error || "Failed to save track license");
          }

          setSavedLicenseType(body.license_type);
          onSaved(savedSong, revisionPending || Boolean(body.revision_pending));
        })
        .catch((error) => {
          setLicenseError(
            error instanceof Error ? error.message : "Failed to save track license",
          );
          onSaved(savedSong, revisionPending);
        })
        .finally(() => setLicenseSaving(false));
    },
    [
      artist.id,
      canEditLicense,
      licenseLoading,
      licenseType,
      onSaved,
      savedLicenseType,
      song.id,
    ],
  );

  return (
    <ArtistSongEditor
      artist={artist}
      songId={song.id}
      onClose={onClose}
      onSaved={handleSaved}
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
      afterSongInfoContent={
        <ArtistSongLicenseSelector
          value={licenseType}
          onChange={setLicenseType}
          disabled={!canEditLicense || licenseLoading || licenseSaving}
          error={licenseError}
        />
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
