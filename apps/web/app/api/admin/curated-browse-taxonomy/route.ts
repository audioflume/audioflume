import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { supabaseServer } from "@/lib/supabaseServer";
import {
  CURATED_BROWSE_FILTERS,
  type CuratedBrowseTag,
} from "@/lib/curatedPlaylists";

const BROWSE_FILTER_VALUES = new Set<CuratedBrowseTag>(
  CURATED_BROWSE_FILTERS.map((filter) => filter.value),
);

function cleanLabel(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanBrowseFilters(value: unknown): CuratedBrowseTag[] {
  if (!Array.isArray(value)) return [];

  return [
    ...new Set(
      value
        .map((filter) => String(filter || "").trim() as CuratedBrowseTag)
        .filter((filter) => BROWSE_FILTER_VALUES.has(filter)),
    ),
  ];
}

function cleanId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const label = cleanLabel(body.label);
    const slug = slugify(label);
    const browseFilters = cleanBrowseFilters(body.browse_filters);

    if (!label || !slug) {
      return NextResponse.json(
        { error: "Missing subcategory name" },
        { status: 400 },
      );
    }

    const { data: existing, error: positionError } = await supabaseServer
      .from("curated_browse_subcategories")
      .select("position")
      .order("position", { ascending: false })
      .limit(1);

    if (positionError) throw positionError;

    const nextPosition =
      existing?.[0]?.position != null ? Number(existing[0].position) + 1 : 0;

    const { data: subcategory, error: insertError } = await supabaseServer
      .from("curated_browse_subcategories")
      .insert({ label, slug, position: nextPosition })
      .select("id, slug, label, position")
      .single();

    if (insertError) throw insertError;

    if (browseFilters.length > 0) {
      const { error: mappingError } = await supabaseServer
        .from("curated_browse_filter_subcategories")
        .insert(
          browseFilters.map((browseFilter) => ({
            browse_filter: browseFilter,
            subcategory_id: subcategory.id,
            position: nextPosition,
          })),
        );

      if (mappingError) {
        await supabaseServer
          .from("curated_browse_subcategories")
          .delete()
          .eq("id", subcategory.id);
        throw mappingError;
      }
    }

    return NextResponse.json(subcategory);
  } catch (err) {
    console.error("Curated browse subcategory create failed:", err);

    const message = err instanceof Error ? err.message : String(err || "");
    const status = message.toLowerCase().includes("duplicate") ? 409 : 500;

    return NextResponse.json(
      {
        error:
          status === 409
            ? "A subcategory with that name already exists"
            : "Failed to create browse subcategory",
      },
      { status },
    );
  }
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = cleanId(body.id);
    const label = cleanLabel(body.label);
    const browseFilters = cleanBrowseFilters(body.browse_filters);

    if (!id || !label) {
      return NextResponse.json(
        { error: "Missing subcategory details" },
        { status: 400 },
      );
    }

    const { data: subcategory, error: updateError } = await supabaseServer
      .from("curated_browse_subcategories")
      .update({ label })
      .eq("id", id)
      .select("id, slug, label, position")
      .single();

    if (updateError) throw updateError;

    const { data: existingMappings, error: mappingsError } = await supabaseServer
      .from("curated_browse_filter_subcategories")
      .select("browse_filter")
      .eq("subcategory_id", id);

    if (mappingsError) throw mappingsError;

    const existingFilters = new Set(
      (existingMappings ?? []).map(
        (mapping) => String(mapping.browse_filter) as CuratedBrowseTag,
      ),
    );
    const nextFilters = new Set(browseFilters);
    const removedFilters = [...existingFilters].filter(
      (filter) => !nextFilters.has(filter),
    );
    const addedFilters = browseFilters.filter(
      (filter) => !existingFilters.has(filter),
    );

    if (removedFilters.length > 0) {
      const { error: removeError } = await supabaseServer
        .from("curated_browse_filter_subcategories")
        .delete()
        .eq("subcategory_id", id)
        .in("browse_filter", removedFilters);

      if (removeError) throw removeError;
    }

    if (addedFilters.length > 0) {
      const { data: filterPositions, error: positionsError } = await supabaseServer
        .from("curated_browse_filter_subcategories")
        .select("browse_filter, position")
        .in("browse_filter", addedFilters);

      if (positionsError) throw positionsError;

      const nextPositionByFilter = new Map<CuratedBrowseTag, number>();
      for (const filter of addedFilters) {
        const maxPosition = Math.max(
          -1,
          ...(filterPositions ?? [])
            .filter((row) => row.browse_filter === filter)
            .map((row) => Number(row.position || 0)),
        );
        nextPositionByFilter.set(filter, maxPosition + 1);
      }

      const { error: addError } = await supabaseServer
        .from("curated_browse_filter_subcategories")
        .insert(
          addedFilters.map((browseFilter) => ({
            browse_filter: browseFilter,
            subcategory_id: id,
            position: nextPositionByFilter.get(browseFilter) ?? 0,
          })),
        );

      if (addError) throw addError;
    }

    return NextResponse.json(subcategory);
  } catch (err) {
    console.error("Curated browse subcategory update failed:", err);
    return NextResponse.json(
      { error: "Failed to update browse subcategory" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = cleanId(body.id);

    if (!id) {
      return NextResponse.json(
        { error: "Missing subcategory id" },
        { status: 400 },
      );
    }

    const { error } = await supabaseServer
      .from("curated_browse_subcategories")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("Curated browse subcategory delete failed:", err);
    return NextResponse.json(
      { error: "Failed to delete browse subcategory" },
      { status: 500 },
    );
  }
}
