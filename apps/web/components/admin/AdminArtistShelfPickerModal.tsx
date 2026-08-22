"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

import AdminModalShell from "@/components/admin/AdminModalShell";
import AdminSearchBar from "@/components/admin/AdminSearchBar";
import { backendModalPrimaryButtonClass } from "@/components/backend/backendClasses";
import CheckIcon from "@/components/icons/CheckIcon";

type AdminArtistOption = {
  id: string;
  name: string;
  slug: string;
  profile_image_url: string | null;
  hero_image_url: string | null;
  status: string;
};

type Props = {
  isOpen: boolean;
  existingIds: readonly string[];
  saving?: boolean;
  onClose: () => void;
  onAdd: (artistIds: string[]) => void | Promise<void>;
};

export default function AdminArtistShelfPickerModal({
  isOpen,
  existingIds,
  saving = false,
  onClose,
  onAdd,
}: Props) {
  const [artists, setArtists] = useState<AdminArtistOption[]>([]);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;
    setSearch("");
    setSelectedIds(new Set());

    async function loadArtists() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch("/api/admin/artists");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || "Failed to load artists");
        }

        if (!cancelled) {
          setArtists(
            (Array.isArray(data?.artists) ? data.artists : []).filter(
              (artist: AdminArtistOption) => artist.status === "approved",
            ),
          );
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load artists",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadArtists();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const existingIdSet = useMemo(() => new Set(existingIds), [existingIds]);
  const displayedArtists = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...artists]
      .filter((artist) => {
        if (!query) return true;
        return [artist.name, artist.slug].some((value) =>
          String(value || "").toLowerCase().includes(query),
        );
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      );
  }, [artists, search]);

  function toggleArtist(artistId: string) {
    if (existingIdSet.has(artistId) || saving) return;

    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(artistId)) next.delete(artistId);
      else next.add(artistId);
      return next;
    });
  }

  async function handleAdd() {
    if (selectedIds.size === 0 || saving) return;
    await onAdd([...selectedIds]);
  }

  const selectedCount = selectedIds.size;

  return (
    <AdminModalShell
      isOpen={isOpen}
      title="Add to Featured Artists"
      onClose={onClose}
      closeLabel="Close featured artist picker"
      footer={
        <button
          type="button"
          onClick={handleAdd}
          className={backendModalPrimaryButtonClass}
          disabled={selectedCount === 0 || saving}
        >
          {saving
            ? "Adding..."
            : selectedCount === 1
              ? "Add Artist"
              : `Add ${selectedCount} Artists`}
        </button>
      }
    >
      <div className="pb-4">
        <AdminSearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search artists"
          variant="modal"
        />
      </div>

      <div className="-mx-5 flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="grid gap-1">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="flex min-h-[52px] animate-pulse items-center gap-3 p-2"
                >
                  <span className="h-9 w-9 shrink-0 bg-[var(--bg-tertiary)]" />
                  <span className="h-3 w-40 bg-[var(--bg-tertiary)]" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="flex min-h-[180px] items-center justify-center px-4 text-center text-xs text-[var(--danger)]">
              {error}
            </div>
          ) : displayedArtists.length === 0 ? (
            <div className="flex min-h-[180px] items-center justify-center px-4 text-center text-xs text-[var(--text-secondary)]">
              No approved artists match your search.
            </div>
          ) : (
            <div className="grid gap-1">
              {displayedArtists.map((artist) => {
                const alreadyAdded = existingIdSet.has(artist.id);
                const selected = selectedIds.has(artist.id);

                return (
                  <button
                    key={artist.id}
                    type="button"
                    onClick={() => toggleArtist(artist.id)}
                    disabled={alreadyAdded || saving}
                    className={`group flex min-h-[52px] w-full items-center gap-3 rounded-none p-2 text-left transition-colors ${
                      alreadyAdded || selected
                        ? "bg-[var(--bg-primary)]"
                        : "cursor-pointer hover:bg-[var(--bg-hover)]"
                    } disabled:cursor-default`}
                  >
                    <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-none bg-[var(--bg-tertiary)] text-[11px] font-medium text-[var(--text-muted)]">
                      {artist.profile_image_url ? (
                        <Image
                          src={artist.profile_image_url}
                          alt={artist.name}
                          fill
                          sizes="36px"
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <span aria-hidden="true">
                          {artist.name.trim().charAt(0).toUpperCase() || "A"}
                        </span>
                      )}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">
                        {artist.name}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                        {alreadyAdded ? "Already added" : `/artists/${artist.slug}`}
                      </span>
                    </span>

                    {(alreadyAdded || selected) && (
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center text-[var(--text-primary)]">
                        <CheckIcon size={16} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </AdminModalShell>
  );
}
