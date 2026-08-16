import {
  CURATED_BROWSE_FILTERS,
  type CuratedBrowseTag,
} from "@/lib/curatedPlaylists";

export type CuratedBrowseSubcategoryRecord = {
  id: number;
  slug: string;
  label: string;
  position: number;
};

export type CuratedBrowseTaxonomyFilter = {
  value: CuratedBrowseTag;
  label: string;
  subcategories: CuratedBrowseSubcategoryRecord[];
};

export type CuratedBrowseTaxonomy = {
  subcategories: CuratedBrowseSubcategoryRecord[];
  filters: CuratedBrowseTaxonomyFilter[];
};

export type CuratedBrowseAssignment = {
  browse_filter: CuratedBrowseTag;
  subcategory_id: number;
};

const CURATED_BROWSE_TAG_VALUES = new Set<CuratedBrowseTag>(
  CURATED_BROWSE_FILTERS.map((filter) => filter.value),
);

export function normalizeCuratedBrowseAssignments(
  value: unknown,
  browseTags?: readonly CuratedBrowseTag[],
): CuratedBrowseAssignment[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const assignments: CuratedBrowseAssignment[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const record = item as Record<string, unknown>;
    const browseFilter = String(record.browse_filter || "").trim() as CuratedBrowseTag;
    const subcategoryId = Number(record.subcategory_id);

    if (!CURATED_BROWSE_TAG_VALUES.has(browseFilter)) continue;
    if (!Number.isInteger(subcategoryId) || subcategoryId <= 0) continue;
    if (browseTags && !browseTags.includes(browseFilter)) continue;

    const key = `${browseFilter}:${subcategoryId}`;
    if (seen.has(key)) continue;

    seen.add(key);
    assignments.push({ browse_filter: browseFilter, subcategory_id: subcategoryId });
  }

  return assignments;
}

export function buildCuratedBrowseTaxonomy(
  subcategoryRows: unknown[],
  mappingRows: unknown[],
): CuratedBrowseTaxonomy {
  const subcategories = subcategoryRows
    .map((row) => {
      const record = row as Record<string, unknown>;
      return {
        id: Number(record.id),
        slug: String(record.slug || ""),
        label: String(record.label || ""),
        position: Number(record.position || 0),
      };
    })
    .filter(
      (subcategory) =>
        Number.isInteger(subcategory.id) &&
        subcategory.id > 0 &&
        subcategory.slug.length > 0 &&
        subcategory.label.length > 0,
    )
    .sort((a, b) => a.position - b.position || a.label.localeCompare(b.label));

  const subcategoryById = new Map(
    subcategories.map((subcategory) => [subcategory.id, subcategory]),
  );

  const mappingsByFilter = new Map<
    CuratedBrowseTag,
    Array<{ subcategory: CuratedBrowseSubcategoryRecord; position: number }>
  >();

  for (const row of mappingRows) {
    const record = row as Record<string, unknown>;
    const browseFilter = String(record.browse_filter || "") as CuratedBrowseTag;
    const subcategoryId = Number(record.subcategory_id);
    const subcategory = subcategoryById.get(subcategoryId);

    if (!CURATED_BROWSE_TAG_VALUES.has(browseFilter) || !subcategory) continue;

    const current = mappingsByFilter.get(browseFilter) ?? [];
    current.push({
      subcategory,
      position: Number(record.position || 0),
    });
    mappingsByFilter.set(browseFilter, current);
  }

  return {
    subcategories,
    filters: CURATED_BROWSE_FILTERS.map((filter) => ({
      value: filter.value,
      label: filter.label,
      subcategories: (mappingsByFilter.get(filter.value) ?? [])
        .sort(
          (a, b) =>
            a.position - b.position ||
            a.subcategory.position - b.subcategory.position ||
            a.subcategory.label.localeCompare(b.subcategory.label),
        )
        .map((entry) => entry.subcategory),
    })),
  };
}
