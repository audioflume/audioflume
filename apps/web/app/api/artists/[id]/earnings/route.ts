import { NextResponse } from "next/server";

import {
  ArtistAccessError,
  requireArtistPermission,
} from "@/lib/artistPermissions";
import { supabaseServer } from "@/lib/supabaseServer";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type EarningRow = {
  id: string;
  source: string;
  status: "pending" | "available" | "void";
  description: string | null;
  gross_amount_cents: number | string | null;
  artist_amount_cents: number | string;
  currency: string;
  earned_at: string;
  period_start: string | null;
  period_end: string | null;
  reference_type: string | null;
  reference_id: string | null;
};

type PayoutRow = {
  id: string;
  amount_cents: number | string;
  currency: string;
  status: "pending" | "processing" | "paid" | "failed" | "cancelled";
  method_label: string | null;
  external_reference: string | null;
  note: string | null;
  requested_at: string | null;
  processed_at: string | null;
  created_at: string;
};

type CurrencySummary = {
  currency: string;
  available_balance_cents: number;
  pending_earnings_cents: number;
  total_earned_cents: number;
  paid_out_cents: number;
  payout_in_progress_cents: number;
};

function toAmount(value: number | string | null | undefined) {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
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
  return access;
}

function ensureCurrency(
  map: Map<string, CurrencySummary>,
  currency: string,
) {
  let summary = map.get(currency);
  if (!summary) {
    summary = {
      currency,
      available_balance_cents: 0,
      pending_earnings_cents: 0,
      total_earned_cents: 0,
      paid_out_cents: 0,
      payout_in_progress_cents: 0,
    };
    map.set(currency, summary);
  }
  return summary;
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const artistId = params.id;

  try {
    await requireFinancialAccess(artistId);

    const [earningsResult, payoutsResult] = await Promise.all([
      supabaseServer
        .from("artist_earnings")
        .select(
          "id, source, status, description, gross_amount_cents, artist_amount_cents, currency, earned_at, period_start, period_end, reference_type, reference_id",
        )
        .eq("artist_id", artistId)
        .order("earned_at", { ascending: false }),
      supabaseServer
        .from("artist_payouts")
        .select(
          "id, amount_cents, currency, status, method_label, external_reference, note, requested_at, processed_at, created_at",
        )
        .eq("artist_id", artistId)
        .order("created_at", { ascending: false }),
    ]);

    if (earningsResult.error) throw earningsResult.error;
    if (payoutsResult.error) throw payoutsResult.error;

    const earnings = (earningsResult.data ?? []) as EarningRow[];
    const payouts = (payoutsResult.data ?? []) as PayoutRow[];
    const currencyMap = new Map<string, CurrencySummary>();
    const sourceMap = new Map<string, number>();
    const statementYears = new Set<number>();

    for (const earning of earnings) {
      const currency = earning.currency.toUpperCase();
      const amount = toAmount(earning.artist_amount_cents);
      const summary = ensureCurrency(currencyMap, currency);
      const year = new Date(earning.earned_at).getUTCFullYear();
      if (Number.isFinite(year)) statementYears.add(year);

      if (earning.status === "void") continue;

      summary.total_earned_cents += amount;
      sourceMap.set(
        `${earning.source}:${currency}`,
        (sourceMap.get(`${earning.source}:${currency}`) ?? 0) + amount,
      );

      if (earning.status === "pending") {
        summary.pending_earnings_cents += amount;
      } else if (earning.status === "available") {
        summary.available_balance_cents += amount;
      }
    }

    for (const payout of payouts) {
      const currency = payout.currency.toUpperCase();
      const amount = toAmount(payout.amount_cents);
      const summary = ensureCurrency(currencyMap, currency);
      const date = payout.processed_at || payout.requested_at || payout.created_at;
      const year = new Date(date).getUTCFullYear();
      if (Number.isFinite(year)) statementYears.add(year);

      if (payout.status === "paid") {
        summary.paid_out_cents += amount;
        summary.available_balance_cents -= amount;
      } else if (payout.status === "pending" || payout.status === "processing") {
        summary.payout_in_progress_cents += amount;
        summary.available_balance_cents -= amount;
      }
    }

    const sourceBreakdown = Array.from(sourceMap.entries())
      .map(([key, amount_cents]) => {
        const separator = key.lastIndexOf(":");
        return {
          source: key.slice(0, separator),
          currency: key.slice(separator + 1),
          amount_cents,
        };
      })
      .sort((a, b) => b.amount_cents - a.amount_cents);

    return NextResponse.json({
      currencies: Array.from(currencyMap.values()).sort((a, b) =>
        a.currency.localeCompare(b.currency),
      ),
      source_breakdown: sourceBreakdown,
      earnings: earnings.slice(0, 100).map((earning) => ({
        ...earning,
        gross_amount_cents:
          earning.gross_amount_cents === null
            ? null
            : toAmount(earning.gross_amount_cents),
        artist_amount_cents: toAmount(earning.artist_amount_cents),
      })),
      payouts: payouts.slice(0, 100).map((payout) => ({
        ...payout,
        amount_cents: toAmount(payout.amount_cents),
      })),
      statement_years: Array.from(statementYears).sort((a, b) => b - a),
    });
  } catch (error) {
    if (error instanceof ArtistAccessError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    }

    console.error("Artist earnings GET error:", error);
    return NextResponse.json(
      { error: "Failed to load artist earnings" },
      { status: 500 },
    );
  }
}
