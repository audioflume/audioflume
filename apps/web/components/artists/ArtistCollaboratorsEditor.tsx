"use client";

import { useEffect, useMemo, useState } from "react";

type ResourceType = "song" | "release";
type CollaboratorRole = "featured" | "collaborator";

type ArtistOption = {
  id: string;
  name: string;
  slug: string;
  profile_image_url: string | null;
};

type CollaboratorRow = {
  artist_id: string;
  role: CollaboratorRole;
};

type CollaboratorResponse = {
  primary_artist?: ArtistOption | null;
  options?: ArtistOption[];
  collaborators?: Array<{
    artist_id: string;
    role: CollaboratorRole;
    position: number;
    artist: ArtistOption;
  }>;
  error?: string;
};

type ArtistCollaboratorsEditorProps = {
  artistId: string;
  resourceType: ResourceType;
  resourceId: string;
  canEdit: boolean;
};

export default function ArtistCollaboratorsEditor({
  artistId,
  resourceType,
  resourceId,
  canEdit,
}: ArtistCollaboratorsEditorProps) {
  const [primaryArtist, setPrimaryArtist] = useState<ArtistOption | null>(null);
  const [options, setOptions] = useState<ArtistOption[]>([]);
  const [rows, setRows] = useState<CollaboratorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCollaborators() {
      try {
        setLoading(true);
        setError("");
        setMessage("");

        const params = new URLSearchParams({
          resource: resourceType,
          resource_id: resourceId,
        });
        const response = await fetch(
          `/api/artists/${artistId}/collaborators?${params.toString()}`,
          { cache: "no-store" },
        );
        const body = (await response.json().catch(() => ({}))) as CollaboratorResponse;

        if (!response.ok) {
          throw new Error(body.error || "Failed to load artist credits");
        }
        if (cancelled) return;

        setPrimaryArtist(body.primary_artist ?? null);
        setOptions(Array.isArray(body.options) ? body.options : []);
        setRows(
          Array.isArray(body.collaborators)
            ? body.collaborators.map((item) => ({
                artist_id: item.artist_id,
                role: item.role,
              }))
            : [],
        );
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load artist credits",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadCollaborators();
    return () => {
      cancelled = true;
    };
  }, [artistId, resourceId, resourceType]);

  const selectedIds = useMemo(
    () => new Set(rows.map((row) => row.artist_id).filter(Boolean)),
    [rows],
  );

  function updateRow(index: number, patch: Partial<CollaboratorRow>) {
    setRows((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patch } : row,
      ),
    );
    setMessage("");
    setError("");
  }

  async function saveCollaborators() {
    if (!canEdit || saving) return;

    const collaborators = rows.filter((row) => row.artist_id);
    if (new Set(collaborators.map((row) => row.artist_id)).size !== collaborators.length) {
      setError("Each collaborator can only be added once.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(`/api/artists/${artistId}/collaborators`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resource: resourceType,
          resource_id: resourceId,
          collaborators,
        }),
      });
      const body = (await response.json().catch(() => ({}))) as CollaboratorResponse;

      if (!response.ok) {
        throw new Error(body.error || "Failed to save artist credits");
      }

      setRows(
        Array.isArray(body.collaborators)
          ? body.collaborators.map((item) => ({
              artist_id: item.artist_id,
              role: item.role,
            }))
          : [],
      );
      setMessage("Artist credits saved.");
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save artist credits",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className={`filmwave-backend-section ${
        resourceType === "release" ? "mt-1 md:mt-4 xl:mt-6" : ""
      }`}
    >
      <div className="filmwave-backend-section-header">
        <h2 className="filmwave-backend-section-title">Artist credits</h2>
      </div>

      <div className="grid gap-4 p-5">
        <div className="grid gap-1">
          <span className="text-[11px] text-[var(--text-muted)] font-[320]">Primary artist</span>
          <div className="text-sm text-[var(--text-primary)] font-[320]">
            {primaryArtist?.name || "Current artist"}
          </div>
        </div>

        {loading ? (
          <div className="text-xs text-[var(--text-muted)] font-[320]">Loading artist credits...</div>
        ) : null}

        {!loading && rows.length === 0 ? (
          <div className="text-xs text-[var(--text-muted)] font-[320]">
            No featured or collaborating artists added.
          </div>
        ) : null}

        {!loading && rows.length > 0 ? (
          <div className="grid gap-2">
            {rows.map((row, index) => (
              <div
                key={`${row.artist_id || "new"}-${index}`}
                className="grid gap-2 md:grid-cols-[minmax(0,1fr)_170px_auto]"
              >
                <select
                  value={row.artist_id}
                  onChange={(event) =>
                    updateRow(index, { artist_id: event.target.value })
                  }
                  disabled={!canEdit || saving}
                  className="filmwave-backend-select"
                >
                  <option value="">Select artist</option>
                  {options.map((option) => {
                    const usedElsewhere =
                      selectedIds.has(option.id) && option.id !== row.artist_id;
                    return (
                      <option key={option.id} value={option.id} disabled={usedElsewhere}>
                        {option.name}
                      </option>
                    );
                  })}
                </select>

                <select
                  value={row.role}
                  onChange={(event) =>
                    updateRow(index, {
                      role: event.target.value as CollaboratorRole,
                    })
                  }
                  disabled={!canEdit || saving}
                  className="filmwave-backend-select"
                >
                  <option value="featured">Featured artist</option>
                  <option value="collaborator">Collaborator</option>
                </select>

                {canEdit ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() =>
                      setRows((current) =>
                        current.filter((_, rowIndex) => rowIndex !== index),
                      )
                    }
                    className="filmwave-backend-button filmwave-backend-button-secondary-danger"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {!loading && options.length === 0 ? (
          <div className="text-xs text-[var(--text-muted)] font-[320]">
            No other approved artist profiles are available yet.
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-h-5 text-xs font-[320]">
            {error ? (
              <span className="text-[var(--danger)]">{error}</span>
            ) : message ? (
              <span className="text-[var(--success)]">{message}</span>
            ) : null}
          </div>

          {canEdit ? (
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving || options.length === 0}
                onClick={() => {
                  setRows((current) => [
                    ...current,
                    { artist_id: "", role: "featured" },
                  ]);
                  setMessage("");
                  setError("");
                }}
                className="filmwave-backend-button filmwave-backend-button-secondary"
              >
                Add artist
              </button>
              <button
                type="button"
                disabled={saving || loading}
                onClick={() => void saveCollaborators()}
                className="filmwave-backend-button filmwave-backend-button-primary"
              >
                {saving ? "Saving..." : "Save artist credits"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
