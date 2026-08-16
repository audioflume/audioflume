"use client";

import { useEffect, useMemo, useState } from "react";
import Toast from "@/components/Toast";
import {
  primaryPillButtonClass,
  secondaryPillButtonClass,
} from "@/components/uiClasses";
import {
  CURATED_BROWSE_FILTERS,
  type CuratedBrowseTag,
} from "@/lib/curatedPlaylists";
import type { CuratedBrowseTaxonomy } from "@/lib/curatedBrowseTaxonomy";

type SubcategoryDraft = {
  label: string;
  browse_filters: CuratedBrowseTag[];
};

function toggleFilter(
  filters: CuratedBrowseTag[],
  filter: CuratedBrowseTag,
): CuratedBrowseTag[] {
  return filters.includes(filter)
    ? filters.filter((value) => value !== filter)
    : [...filters, filter];
}

export default function AdminBrowseTaxonomyView() {
  const [taxonomy, setTaxonomy] = useState<CuratedBrowseTaxonomy | null>(null);
  const [drafts, setDrafts] = useState<Record<number, SubcategoryDraft>>({});
  const [newLabel, setNewLabel] = useState("");
  const [newFilters, setNewFilters] = useState<CuratedBrowseTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | "new" | null>(null);
  const [toastMessage, setToastMessage] = useState("");

  async function loadTaxonomy() {
    const res = await fetch("/api/curated-browse-taxonomy");
    const data = (await res.json()) as CuratedBrowseTaxonomy & { error?: string };

    if (!res.ok) {
      throw new Error(data?.error || "Failed to load browse subcategories");
    }

    const nextDrafts: Record<number, SubcategoryDraft> = {};
    for (const subcategory of data.subcategories) {
      nextDrafts[subcategory.id] = {
        label: subcategory.label,
        browse_filters: data.filters
          .filter((filter) =>
            filter.subcategories.some((item) => item.id === subcategory.id),
          )
          .map((filter) => filter.value),
      };
    }

    setTaxonomy(data);
    setDrafts(nextDrafts);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        await loadTaxonomy();
      } catch (err) {
        if (!cancelled) {
          setToastMessage(
            err instanceof Error
              ? err.message
              : "Failed to load browse subcategories",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  const filterCounts = useMemo(() => {
    const counts = new Map<CuratedBrowseTag, number>();
    for (const filter of taxonomy?.filters ?? []) {
      counts.set(filter.value, filter.subcategories.length);
    }
    return counts;
  }, [taxonomy]);

  async function createSubcategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (savingId || !newLabel.trim()) return;

    try {
      setSavingId("new");
      const res = await fetch("/api/admin/curated-browse-taxonomy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: newLabel,
          browse_filters: newFilters,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create browse subcategory");
      }

      setNewLabel("");
      setNewFilters([]);
      await loadTaxonomy();
      setToastMessage("Browse subcategory created");
    } catch (err) {
      setToastMessage(
        err instanceof Error
          ? err.message
          : "Failed to create browse subcategory",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function saveSubcategory(id: number) {
    const draft = drafts[id];
    if (!draft || savingId) return;

    try {
      setSavingId(id);
      const res = await fetch("/api/admin/curated-browse-taxonomy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          label: draft.label,
          browse_filters: draft.browse_filters,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update browse subcategory");
      }

      await loadTaxonomy();
      setToastMessage("Browse subcategory updated");
    } catch (err) {
      setToastMessage(
        err instanceof Error
          ? err.message
          : "Failed to update browse subcategory",
      );
    } finally {
      setSavingId(null);
    }
  }

  async function deleteSubcategory(id: number) {
    const subcategory = taxonomy?.subcategories.find((item) => item.id === id);
    if (!subcategory || savingId) return;

    const confirmed = window.confirm(
      `Delete "${subcategory.label}"? This will remove it from every browse filter and playlist assignment.`,
    );
    if (!confirmed) return;

    try {
      setSavingId(id);
      const res = await fetch("/api/admin/curated-browse-taxonomy", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete browse subcategory");
      }

      await loadTaxonomy();
      setToastMessage("Browse subcategory deleted");
    } catch (err) {
      setToastMessage(
        err instanceof Error
          ? err.message
          : "Failed to delete browse subcategory",
      );
    } finally {
      setSavingId(null);
    }
  }

  if (loading) {
    return <div className="h-48 animate-pulse rounded-[10px] bg-[var(--bg-tertiary)]" />;
  }

  return (
    <>
      <section className="grid gap-5">
        <div>
          <h2 className="font-[family-name:var(--font-aktiv-grotesk)] text-2xl font-medium tracking-[-0.05em]">
            Browse Subcategories
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Create each subcategory once, then choose which browse filters it appears under.
          </p>
        </div>

        <form onSubmit={createSubcategory} className="grid gap-4 border-t border-[var(--border)] pt-5">
          <label className="grid max-w-xl gap-2 text-xs font-medium text-[var(--text-secondary)]">
            New subcategory
            <input
              value={newLabel}
              onChange={(event) => setNewLabel(event.target.value)}
              className="h-11 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
              placeholder="Subcategory name"
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {CURATED_BROWSE_FILTERS.map((filter) => (
              <label
                key={filter.value}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)]"
              >
                <input
                  type="checkbox"
                  checked={newFilters.includes(filter.value)}
                  onChange={() =>
                    setNewFilters((current) =>
                      toggleFilter(current, filter.value),
                    )
                  }
                  className="h-3.5 w-3.5 accent-[var(--text-primary)]"
                />
                <span>{filter.label}</span>
              </label>
            ))}
          </div>

          <div>
            <button
              type="submit"
              className={primaryPillButtonClass}
              disabled={savingId === "new" || !newLabel.trim()}
            >
              {savingId === "new" ? "Creating..." : "Create subcategory"}
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-4">
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[var(--text-muted)]">
          {CURATED_BROWSE_FILTERS.map((filter) => (
            <span key={filter.value}>
              {filter.label}: {filterCounts.get(filter.value) ?? 0}
            </span>
          ))}
        </div>

        <div className="grid gap-3">
          {(taxonomy?.subcategories ?? []).map((subcategory) => {
            const draft = drafts[subcategory.id];
            if (!draft) return null;

            return (
              <div
                key={subcategory.id}
                className="grid gap-4 rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] p-4"
              >
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <label className="grid min-w-[220px] flex-1 gap-2 text-xs font-medium text-[var(--text-secondary)]">
                    Subcategory name
                    <input
                      value={draft.label}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [subcategory.id]: {
                            ...current[subcategory.id],
                            label: event.target.value,
                          },
                        }))
                      }
                      className="h-10 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--text-muted)]"
                    />
                  </label>
                  <span className="pb-2 text-[11px] text-[var(--text-muted)]">
                    {subcategory.slug}
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {CURATED_BROWSE_FILTERS.map((filter) => (
                    <label
                      key={filter.value}
                      className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-secondary)]"
                    >
                      <input
                        type="checkbox"
                        checked={draft.browse_filters.includes(filter.value)}
                        onChange={() =>
                          setDrafts((current) => ({
                            ...current,
                            [subcategory.id]: {
                              ...current[subcategory.id],
                              browse_filters: toggleFilter(
                                current[subcategory.id]?.browse_filters ?? [],
                                filter.value,
                              ),
                            },
                          }))
                        }
                        className="h-3.5 w-3.5 accent-[var(--text-primary)]"
                      />
                      <span>{filter.label}</span>
                    </label>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={primaryPillButtonClass}
                    disabled={savingId === subcategory.id || !draft.label.trim()}
                    onClick={() => void saveSubcategory(subcategory.id)}
                  >
                    {savingId === subcategory.id ? "Saving..." : "Save"}
                  </button>
                  <button
                    type="button"
                    className={secondaryPillButtonClass}
                    disabled={savingId === subcategory.id}
                    onClick={() => void deleteSubcategory(subcategory.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <Toast message={toastMessage} bottomOffset="24px" />
    </>
  );
}
