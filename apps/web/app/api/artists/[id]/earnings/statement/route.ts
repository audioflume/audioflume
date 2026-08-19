import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

function toAmount(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

function moneyFromCents(value: number) {
  return (value / 100).toFixed(2);
}

async function requireFinancialAccess(artistId: string) {
  const access = await requireArtistPermission(artistId, "artist:view");
  if (
    access.role !== "owner" &&
    access.role !== "manager" &&
    access.role !== "admin"
  ) {
    throw new ArtistAccessError("Forbidden", 403);
  }
}

export async function GET(request: Request, context: RouteContext) {
  const params = await context.params;
  const artistId = params.id;

  try {
    await requireFinancialAccess(artistId);

    const requestedYear = Number(new URL(request.url).searchParams.get("year"));
    const currentYear = new Date().getUTCFullYear();
    const year =
      Number.isInteger(requestedYear) && requestedYear >= 2000 && requestedYear <= 2100
        ? requestedYear
        : currentYear;
    const from = `${year}-01-01T00:00:00.000Z`;
    const to = `${year + 1}-01-01T00:00:00.000Z`;

    const [artistResult, earningsResult, payoutsResult] = await Promise.all([
      supabaseServer
        .from("artists")
        .select("name")
        .eq("id", artistId)
        .maybeSingle(),
      supabaseServer
        .from("artist_earnings")
        .select(
          "id, source, status, description, gross_amount_cents, artist_amount_cents, currency, earned_at, reference_type, reference_id",
        )
        .eq("artist_id", artistId)
        .gte("earned_at", from)
        .lt("earned_at", to)
        .order("earned_at", { ascending: true }),
      supabaseServer
        .from("artist_payouts")
        .select(
          "id, amount_cents, currency, status, method_label, external_reference, note, requested_at, processed_at, created_at",
        )
        .eq("artist_id", artistId)
        .gte("created_at", from)
        .lt("created_at", to)
        .order("created_at", { ascending: true }),
    ]);

    if (artistResult.error) throw artistResult.error;
    if (earningsResult.error) throw earningsResult.error;
    if (payoutsResult.error) throw payoutsResult.error;

    const rows: string[][] = [[
      "Date",
      "Type",
      "Source / Status",
      "Description",
      "Gross Amount",
      "Artist Amount",
      "Currency",
      "Reference",
    ]];

    for (const earning of earningsResult.data ?? []) {
      rows.push([
        earning.earned_at,
        "Earning",
        `${earning.source} / ${earning.status}`,
        earning.description || "",
        earning.gross_amount_cents === null
          ? ""
          : moneyFromCents(toAmount(earning.gross_amount_cents)),
        moneyFromCents(toAmount(earning.artist_amount_cents)),
        earning.currency,
        [earning.reference_type, earning.reference_id].filter(Boolean).join(":"),
      ]);
    }

    for (const payout of payoutsResult.data ?? []) {
      const date = payout.processed_at || payout.requested_at || payout.created_at;
      rows.push([
        date,
        "Payout",
        payout.status,
        payout.note || payout.method_label || "",
        "",
        moneyFromCents(-toAmount(payout.amount_cents)),
        payout.currency,
        payout.external_reference || "",
      ]);
    }

    const body = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    const safeArtistName = (artistResult.data?.name || "artist")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "artist";

    return new Response(`\uFEFF${body}`, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="audioflume-${safeArtistName}-statement-${year}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return Response.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Artist earnings statement error:", error);
    return Response.json(
      { error: "Failed to generate artist statement" },
      { status: 500 },
    );
  }
}
