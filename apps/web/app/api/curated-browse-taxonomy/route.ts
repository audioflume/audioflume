import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { buildCuratedBrowseTaxonomy } from "@/lib/curatedBrowseTaxonomy";

export async function GET() {
  try {
    const [subcategoriesResult, mappingsResult] = await Promise.all([
      supabaseServer
        .from("curated_browse_subcategories")
        .select("id, slug, label, position")
        .order("position", { ascending: true }),
      supabaseServer
        .from("curated_browse_filter_subcategories")
        .select("browse_filter, subcategory_id, position")
        .order("position", { ascending: true }),
    ]);

    if (subcategoriesResult.error) throw subcategoriesResult.error;
    if (mappingsResult.error) throw mappingsResult.error;

    return NextResponse.json(
      buildCuratedBrowseTaxonomy(
        subcategoriesResult.data ?? [],
        mappingsResult.data ?? [],
      ),
    );
  } catch (err) {
    console.error("Curated browse taxonomy fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to load browse subcategories" },
      { status: 500 },
    );
  }
}
