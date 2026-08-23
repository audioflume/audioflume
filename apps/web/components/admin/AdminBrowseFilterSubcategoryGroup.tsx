"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BackendCheckbox } from "@/components/backend/BackendControls";
import ChevronDownIcon from "@/components/icons/ChevronDownIcon";
import EditIcon from "@/components/icons/EditIcon";
import type {
  CuratedBrowseSubcategoryRecord,
  CuratedBrowseTaxonomy,
  CuratedBrowseTaxonomyFilter,
} from "@/lib/curatedBrowseTaxonomy";
import type { CuratedBrowseTag } from "@/lib/curatedPlaylists";

type GroupMode = "edit" | null;

type Props = {
  filter: CuratedBrowseTaxonomyFilter;
  taxonomy: CuratedBrowseTaxonomy;
  selectedIds: number[];
  onToggleAssignment: (subcategoryId: number) => void;
  onTaxonomyChange: (taxonomy: CuratedBrowseTaxonomy) => void;
  onDeletedSubcategories: (subcategoryIds: number[]) => void;
  onToast: (message: string) => void;
};

function getSubcategoryFilters(
  taxonomy: CuratedBrowseTaxonomy,
  subcategoryId: number,
): CuratedBrowseTag[] {
  return taxonomy.filters
    .filter((filter) =>
      filter.subcategories.some((subcategory) => subcategory.id === subcategoryId),
    )
    .map((filter) => filter.value);
}

export default function AdminBrowseFilterSubcategoryGroup({
  filter,
  taxonomy,
  selectedIds,
  onToggleAssignment,
  onTaxonomyChange,
  onDeletedSubcategories,
  onToast,
}: Props) {
  const [mode, setMode] = useState<GroupMode>(null);
  const [labelDrafts, setLabelDrafts] = useState<Record<number, string>>({});
  const [newFieldOpen, setNewFieldOpen] = useState(false);
  const [newValue, setNewValue] = useState("");
  const [selectedExistingId, setSelectedExistingId] = useState<number | null>(null);
  const [newDropdownOpen, setNewDropdownOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<number[]>([]);
  const [editTouched, setEditTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const newCategoryRef = useRef<HTMLDivElement>(null);

  const currentSubcategoryIds = useMemo(
    () => new Set(filter.subcategories.map((subcategory) => subcategory.id)),
    [filter.subcategories],
  );

  const availableExisting = useMemo(() => {
    const query = newValue.trim().toLowerCase();

    return taxonomy.subcategories.filter(
      (subcategory) =>
        !currentSubcategoryIds.has(subcategory.id) &&
        (!query || subcategory.label.toLowerCase().includes(query)),
    );
  }, [currentSubcategoryIds, newValue, taxonomy.subcategories]);

  useEffect(() => {
    if (!newFieldOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (newCategoryRef.current?.contains(event.target as Node)) return;

      setNewDropdownOpen(false);

      if (!newValue.trim() && selectedExistingId === null) {
        setNewFieldOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [newFieldOpen, newValue, selectedExistingId]);

  function resetEditState() {
    setLabelDrafts({});
    setNewFieldOpen(false);
    setNewValue("");
    setSelectedExistingId(null);
    setNewDropdownOpen(false);
    setDeleteIds([]);
    setEditTouched(false);
  }

  function enterEditMode() {
    const nextDrafts: Record<number, string> = {};
    for (const subcategory of filter.subcategories) {
      nextDrafts[subcategory.id] = subcategory.label;
    }
    setLabelDrafts(nextDrafts);
    setDeleteIds([]);
    setEditTouched(false);
    setMode("edit");
  }

  function toggleEditMode() {
    if (mode === "edit") {
      resetEditState();
      setMode(null);
      return;
    }

    enterEditMode();
  }

  async function refreshTaxonomy() {
    const res = await fetch("/api/curated-browse-taxonomy");
    const data = (await res.json()) as CuratedBrowseTaxonomy & { error?: string };

    if (!res.ok) {
      throw new Error(data?.error || "Failed to refresh browse subcategories");
    }

    onTaxonomyChange(data);
  }

  async function saveEdits() {
    if (saving || !editTouched) return;

    const changedSubcategories = filter.subcategories.filter((subcategory) => {
      const nextLabel = (labelDrafts[subcategory.id] ?? subcategory.label).trim();
      return nextLabel && nextLabel !== subcategory.label;
    });

    const mergeTargets = new Map<number, CuratedBrowseSubcategoryRecord>();

    for (const subcategory of changedSubcategories) {
      const nextLabel = (labelDrafts[subcategory.id] ?? subcategory.label).trim();
      const existing = taxonomy.subcategories.find(
        (candidate) =>
          candidate.id !== subcategory.id &&
          candidate.label.toLowerCase() === nextLabel.toLowerCase(),
      );

      if (!existing) continue;

      const confirmed = window.confirm(
        `A category named "${existing.label}" already exists. Merge "${subcategory.label}" into "${existing.label}" globally? This will combine their browse-filter and playlist assignments.`,
      );

      if (!confirmed) return;
      mergeTargets.set(subcategory.id, existing);
    }

    try {
      setSaving(true);
      let didMerge = false;

      for (const subcategory of changedSubcategories) {
        const nextLabel = (labelDrafts[subcategory.id] ?? subcategory.label).trim();
        const mergeTarget = mergeTargets.get(subcategory.id);
        const res = await fetch("/api/admin/curated-browse-taxonomy", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            mergeTarget
              ? {
                  id: subcategory.id,
                  label: mergeTarget.label,
                  merge_into_id: mergeTarget.id,
                }
              : {
                  id: subcategory.id,
                  label: nextLabel,
                  browse_filters: getSubcategoryFilters(
                    taxonomy,
                    subcategory.id,
                  ),
                },
          ),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            data?.error ||
              (mergeTarget
                ? "Failed to merge browse subcategories"
                : "Failed to rename browse subcategory"),
          );
        }

        if (mergeTarget) didMerge = true;
      }

      const nextName = newValue.trim();
      if (newFieldOpen && nextName) {
        const exactExisting = taxonomy.subcategories.find(
          (subcategory) => subcategory.label.toLowerCase() === nextName.toLowerCase(),
        );
        const existing =
          taxonomy.subcategories.find(
            (subcategory) => subcategory.id === selectedExistingId,
          ) ?? exactExisting;

        if (existing) {
          const currentFilters = getSubcategoryFilters(taxonomy, existing.id);
          if (!currentFilters.includes(filter.value)) {
            const res = await fetch("/api/admin/curated-browse-taxonomy", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: existing.id,
                label: existing.label,
                browse_filters: [...currentFilters, filter.value],
              }),
            });
            const data = await res.json();
            if (!res.ok) {
              throw new Error(data?.error || "Failed to add browse subcategory");
            }
          }
        } else {
          const res = await fetch("/api/admin/curated-browse-taxonomy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: nextName,
              browse_filters: [filter.value],
            }),
          });
          const data = await res.json();
          if (!res.ok) {
            throw new Error(data?.error || "Failed to create browse subcategory");
          }
        }
      }

      await refreshTaxonomy();

      if (didMerge) {
        window.location.reload();
        return;
      }

      resetEditState();
      setMode(null);
      onToast("Browse subcategories updated");
    } catch (err) {
      onToast(
        err instanceof Error ? err.message : "Failed to update browse subcategories",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteSelected() {
    if (saving || deleteIds.length === 0) return;

    const names = filter.subcategories
      .filter((subcategory) => deleteIds.includes(subcategory.id))
      .map((subcategory) => subcategory.label);
    const confirmed = window.confirm(
      `Delete ${names.length === 1 ? `"${names[0]}"` : `${names.length} categories`} globally? This removes ${names.length === 1 ? "it" : "them"} from every browse filter and playlist.`,
    );

    if (!confirmed) return;

    try {
      setSaving(true);
      const res = await fetch("/api/admin/curated-browse-taxonomy", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: deleteIds }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete browse subcategories");
      }

      onDeletedSubcategories(deleteIds);
      setLabelDrafts((current) => {
        const next = { ...current };
        for (const id of deleteIds) delete next[id];
        return next;
      });
      await refreshTaxonomy();
      setDeleteIds([]);
      onToast(names.length === 1 ? "Category deleted" : "Categories deleted");
    } catch (err) {
      onToast(
        err instanceof Error ? err.message : "Failed to delete browse subcategories",
      );
    } finally {
      setSaving(false);
    }
  }

  function toggleDeleteId(subcategoryId: number) {
    setDeleteIds((current) =>
      current.includes(subcategoryId)
        ? current.filter((id) => id !== subcategoryId)
        : [...current, subcategoryId],
    );
  }

  function selectExisting(subcategory: CuratedBrowseSubcategoryRecord) {
    setNewValue(subcategory.label);
    setSelectedExistingId(subcategory.id);
    setNewDropdownOpen(false);
    setEditTouched(true);
  }

  return (
    <section className="group relative admin-playlist-section-card admin-playlist-shelf-card">
      <div className="mb-4 flex min-h-8 items-center justify-between gap-4">
        <h2 className="font-[family-name:var(--font-zalando-sans)] text-2xl tracking-[-0.05em] font-[200]">
          {filter.label}
        </h2>

        <div className="flex shrink-0 items-center gap-3">
          {mode === "edit" && editTouched && (
            <button
              type="button"
              onClick={() => void saveEdits()}
              disabled={saving}
              className="text-[11px] font-normal text-[var(--text-primary)] transition disabled:opacity-40"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          )}

          {mode === "edit" && deleteIds.length > 0 && (
            <button
              type="button"
              onClick={() => void deleteSelected()}
              disabled={saving}
              className="text-[11px] font-normal text-[var(--danger)] transition disabled:opacity-40"
            >
              {saving ? "Deleting..." : "Delete"}
            </button>
          )}

          {mode === "edit" && (
            <button
              type="button"
              onClick={() => {
                resetEditState();
                setMode(null);
              }}
              disabled={saving}
              className="text-[11px] font-normal text-[var(--text-muted)] transition hover:text-[var(--text-primary)] disabled:opacity-40"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            onClick={toggleEditMode}
            className={`flex h-8 w-8 items-center justify-center bg-transparent transition ${
              mode === "edit"
                ? "text-[var(--text-primary)]"
                : "text-[var(--text-muted)] opacity-0 group-hover:opacity-100 focus:opacity-100"
            }`}
            aria-label={`${mode === "edit" ? "Close" : "Edit"} ${filter.label}`}
            aria-pressed={mode === "edit"}
            disabled={saving}
          >
            <EditIcon size={14} />
          </button>
        </div>
      </div>

      <div className="grid auto-rows-[40px] gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {filter.subcategories.map((subcategory) => {
          const checked =
            mode === "edit"
              ? deleteIds.includes(subcategory.id)
              : selectedIds.includes(subcategory.id);

          return (
            <div
              key={subcategory.id}
              className="group/browse-subcategory flex h-10 items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-0 text-xs text-[var(--text-secondary)] font-[320]"
            >
              <BackendCheckbox
                checked={checked}
                compact
                size="sm"
                className="group-hover/browse-subcategory:[&>span]:border-[var(--text-secondary)]"
                ariaLabel={
                  mode === "edit"
                    ? `Select ${subcategory.label} for deletion`
                    : `Toggle ${subcategory.label}`
                }
                onChange={() =>
                  mode === "edit"
                    ? toggleDeleteId(subcategory.id)
                    : onToggleAssignment(subcategory.id)
                }
              />

              {mode === "edit" ? (
                <input
                  value={labelDrafts[subcategory.id] ?? subcategory.label}
                  onChange={(event) => {
                    setLabelDrafts((current) => ({
                      ...current,
                      [subcategory.id]: event.target.value,
                    }));
                    setEditTouched(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") event.preventDefault();
                  }}
                  className="min-w-0 flex-1 bg-transparent text-xs text-[var(--text-secondary)] outline-none"
                  aria-label={`Rename ${subcategory.label}`}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => onToggleAssignment(subcategory.id)}
                  className="min-w-0 flex-1 truncate text-left"
                >
                  {subcategory.label}
                </button>
              )}
            </div>
          );
        })}

        {mode === "edit" && !newFieldOpen && (
          <button
            type="button"
            onClick={() => {
              setNewFieldOpen(true);
              setNewDropdownOpen(true);
            }}
            className="flex h-10 items-center rounded-lg border border-dashed border-[var(--border)] px-3 py-0 text-left text-xs text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
          >
            New
          </button>
        )}

        {mode === "edit" && newFieldOpen && (
          <div ref={newCategoryRef} className="relative h-10 min-w-[140px]">
            <div className="flex h-10 min-w-0 items-center rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]">
              <input
                value={newValue}
                onChange={(event) => {
                  setNewValue(event.target.value);
                  setSelectedExistingId(null);
                  setNewDropdownOpen(true);
                  setEditTouched(true);
                }}
                onFocus={() => setNewDropdownOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
                className="h-full w-full min-w-0 flex-1 bg-transparent px-3 py-0 text-xs text-[var(--text-secondary)] outline-none placeholder:text-[var(--text-muted)]"
                placeholder="Category Name"
                aria-label={`New category for ${filter.label}`}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setNewDropdownOpen((current) => !current)}
                className="flex h-full w-7 shrink-0 items-center justify-center text-[var(--text-muted)]"
                aria-label="Show existing categories"
              >
                <ChevronDownIcon size={14} />
              </button>
            </div>

            {newDropdownOpen && availableExisting.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] py-1 shadow-lg">
                {availableExisting.map((subcategory) => (
                  <button
                    key={subcategory.id}
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => selectExisting(subcategory)}
                    className="block w-full px-3 py-2 text-left text-xs text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  >
                    {subcategory.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
