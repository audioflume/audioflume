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
import {
  BackendInput,
  BackendSelect,
} from "@/components/backend/BackendControls";
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

type ReleaseType = "single" | "ep" | "album";

type ArtistReleaseOption = ArtistSongCurrentRelease & {
  release_date: string | null;
  track_ids: string[];
};

type ReleasesResponse = {
  releases?: ArtistReleaseOption[];
  release?: ArtistReleaseOption;
  error?: string;
};

type ReleaseAssignmentResponse = {
  current_release?: ArtistSongCurrentRelease | null;
  error?: string;
};

type ReleaseArtworkResponse = {
  release?: {
    id: string;
    cover_image_url: string | null;
  };
  error?: string;
};

function normalizeYearInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 4);
}

function releaseYearToDate(value: string) {
  if (!value) return null;
  if (!/^\d{4}$/.test(value)) return undefined;
  return `${value}-01-01`;
}

export default function ArtistSongEditorWithCollaborators({
  artist,
  song,
  onClose,
  onSaved,
}: ArtistSongEditorWithCollaboratorsProps) {
  const [currentRelease, setCurrentRelease] =
    useState<ArtistSongCurrentRelease | null>(null);
  const [releaseRefreshKey, setReleaseRefreshKey] = useState(0);
  const [releases, setReleases] = useState<ArtistReleaseOption[]>([]);
  const [releasesLoading, setReleasesLoading] = useState(false);
  const [releaseSaving, setReleaseSaving] = useState(false);
  const [releaseError, setReleaseError] = useState("");
  const [createReleaseOpen, setCreateReleaseOpen] = useState(false);
  const [createReleaseTitle, setCreateReleaseTitle] = useState("");
  const [createReleaseType, setCreateReleaseType] =
    useState<ReleaseType>("single");
  const [createReleaseYear, setCreateReleaseYear] = useState("");
  const [createReleaseArtwork, setCreateReleaseArtwork] = useState<File | null>(
    null,
  );
  const [creatingRelease, setCreatingRelease] = useState(false);
  const [createReleaseError, setCreateReleaseError] = useState("");
  const [licenseType, setLicenseType] =
    useState<ArtistSongLicenseType>("premium");
  const [savedLicenseType, setSavedLicenseType] =
    useState<ArtistSongLicenseType>("premium");
  const [licenseLoading, setLicenseLoading] = useState(true);
  const [licenseSaving, setLicenseSaving] = useState(false);
  const [licenseError, setLicenseError] = useState("");
  const canEditLicense = artist.permissions.includes("catalog:edit");
  const canManageReleases =
    artist.status === "approved" && artist.permissions.includes("release:manage");

  const handleReleaseLoaded = useCallback(
    (release: ArtistSongCurrentRelease | null) => setCurrentRelease(release),
    [],
  );

  useEffect(() => {
    if (!canManageReleases) return;

    let cancelled = false;
    setReleasesLoading(true);
    setReleaseError("");

    void fetch(`/api/artists/${artist.id}/releases`, { cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => ({}))) as ReleasesResponse;
        if (!response.ok) {
          throw new Error(body.error || "Failed to load releases");
        }
        if (!cancelled) {
          setReleases(Array.isArray(body.releases) ? body.releases : []);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setReleaseError(
            error instanceof Error ? error.message : "Failed to load releases",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setReleasesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [artist.id, canManageReleases]);

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

  async function assignRelease(releaseId: string | null) {
    if (!canManageReleases || releaseSaving) return;

    try {
      setReleaseSaving(true);
      setReleaseError("");

      const response = await fetch(
        `/api/artists/${artist.id}/songs/${song.id}/release`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ release_id: releaseId }),
        },
      );
      const body = (await response.json().catch(() => ({}))) as ReleaseAssignmentResponse;

      if (!response.ok) {
        throw new Error(body.error || "Failed to update track release");
      }

      setCurrentRelease(body.current_release ?? null);
      setReleaseRefreshKey((current) => current + 1);
    } catch (error) {
      setReleaseError(
        error instanceof Error ? error.message : "Failed to update track release",
      );
    } finally {
      setReleaseSaving(false);
    }
  }

  function resetCreateReleaseForm() {
    setCreateReleaseTitle("");
    setCreateReleaseType("single");
    setCreateReleaseYear("");
    setCreateReleaseArtwork(null);
    setCreateReleaseError("");
  }

  async function handleCreateRelease() {
    if (
      !canManageReleases ||
      creatingRelease ||
      !createReleaseTitle.trim() ||
      !createReleaseArtwork
    ) {
      return;
    }

    const releaseDate = releaseYearToDate(createReleaseYear);
    if (releaseDate === undefined) {
      setCreateReleaseError("Enter a valid four-digit release year.");
      return;
    }

    try {
      setCreatingRelease(true);
      setCreateReleaseError("");

      const response = await fetch(`/api/artists/${artist.id}/releases`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createReleaseTitle.trim(),
          release_type: createReleaseType,
          release_date: releaseDate,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as ReleasesResponse;

      if (!response.ok || !body.release) {
        throw new Error(body.error || "Failed to create release");
      }

      let release = body.release;

      try {
        const artworkFormData = new FormData();
        artworkFormData.append("file", createReleaseArtwork);

        const artworkResponse = await fetch(
          `/api/artists/${artist.id}/releases/${release.id}/artwork`,
          { method: "POST", body: artworkFormData },
        );
        const artworkBody = (await artworkResponse
          .json()
          .catch(() => ({}))) as ReleaseArtworkResponse;

        if (!artworkResponse.ok || !artworkBody.release?.cover_image_url) {
          throw new Error(artworkBody.error || "Failed to upload release artwork");
        }

        release = {
          ...release,
          cover_image_url: artworkBody.release.cover_image_url,
        };
      } catch (artworkError) {
        await fetch(`/api/artists/${artist.id}/releases/${release.id}`, {
          method: "DELETE",
        }).catch(() => undefined);
        throw artworkError;
      }

      setReleases((current) => [
        release,
        ...current.filter((item) => item.id !== release.id),
      ]);
      setCreateReleaseOpen(false);
      resetCreateReleaseForm();
      await assignRelease(release.id);
    } catch (error) {
      setCreateReleaseError(
        error instanceof Error ? error.message : "Failed to create release",
      );
    } finally {
      setCreatingRelease(false);
    }
  }

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
          key={`${song.id}-${releaseRefreshKey}`}
          artist={artist}
          songId={song.id}
          onReleaseLoaded={handleReleaseLoaded}
          onRevisionPending={() =>
            onSaved({ id: song.id, title: song.title }, true)
          }
          releaseDraftMode={createReleaseOpen}
          releaseDraftArtworkFile={createReleaseArtwork}
          onReleaseDraftArtworkChange={setCreateReleaseArtwork}
          releaseDraftArtworkDisabled={creatingRelease}
        />
      }
      songInfoExtra={
        <div>
          <BackendSelect
            aria-label="Release"
            value={createReleaseOpen ? "__create__" : currentRelease?.id ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              if (value === "__create__") {
                resetCreateReleaseForm();
                setCreateReleaseOpen(true);
                return;
              }
              setCreateReleaseOpen(false);
              void assignRelease(value || null);
            }}
            disabled={!canManageReleases || releasesLoading || releaseSaving}
            className={`filmwave-backend-select-end-control ${
              currentRelease
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-muted)]"
            }`}
          >
            <option value="">Not part of a release</option>
            {releases.map((release) => (
              <option key={release.id} value={release.id}>
                {release.title}
              </option>
            ))}
            {canManageReleases ? (
              <option value="__create__">Create new release...</option>
            ) : null}
          </BackendSelect>
          {releaseError ? (
            <div className="mt-1.5 text-[11px] leading-4 text-[var(--status-error,#dc584f)]">
              {releaseError}
            </div>
          ) : null}
        </div>
      }
      afterSongInfoContent={
        <>
          {createReleaseOpen ? (
            <section className="filmwave-backend-section">
              <div className="filmwave-backend-section-header">
                <h2 className="filmwave-backend-section-title">New Release</h2>
              </div>
              <div className="grid gap-4 px-5 pb-5">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px]">
                  <BackendInput
                    aria-label="Release title"
                    value={createReleaseTitle}
                    onChange={(event) => setCreateReleaseTitle(event.target.value)}
                    placeholder="Release title"
                    disabled={creatingRelease}
                  />
                  <BackendSelect
                    aria-label="Release type"
                    value={createReleaseType}
                    onChange={(event) =>
                      setCreateReleaseType(event.target.value as ReleaseType)
                    }
                    disabled={creatingRelease}
                  >
                    <option value="single">Single</option>
                    <option value="ep">EP</option>
                    <option value="album">Album</option>
                  </BackendSelect>
                  <BackendInput
                    aria-label="Release year"
                    inputMode="numeric"
                    value={createReleaseYear}
                    onChange={(event) =>
                      setCreateReleaseYear(normalizeYearInput(event.target.value))
                    }
                    placeholder="Year"
                    disabled={creatingRelease}
                  />
                </div>

                {createReleaseError ? (
                  <div className="text-xs leading-5 text-[var(--status-error,#dc584f)]">
                    {createReleaseError}
                  </div>
                ) : null}

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    disabled={creatingRelease}
                    onClick={() => {
                      setCreateReleaseOpen(false);
                      resetCreateReleaseForm();
                    }}
                    className="filmwave-backend-button filmwave-backend-button-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={
                      creatingRelease ||
                      !createReleaseTitle.trim() ||
                      !createReleaseArtwork
                    }
                    onClick={() => void handleCreateRelease()}
                    className="filmwave-backend-button filmwave-backend-button-primary"
                  >
                    {creatingRelease ? "Creating..." : "Create Release"}
                  </button>
                </div>
              </div>
            </section>
          ) : null}

          <ArtistSongLicenseSelector
            value={licenseType}
            onChange={setLicenseType}
            disabled={!canEditLicense || licenseLoading || licenseSaving}
            error={licenseError}
          />
        </>
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
