"use client";

import { useEffect, useState } from "react";

type CurrencySummary = {
  currency: string;
  available_balance_cents: number;
  pending_earnings_cents: number;
  total_earned_cents: number;
  paid_out_cents: number;
  payout_in_progress_cents: number;
};

type SourceBreakdown = {
  source: string;
  currency: string;
  amount_cents: number;
};

type Earning = {
  id: string;
  source: string;
  status: "pending" | "available" | "void";
  description: string | null;
  gross_amount_cents: number | null;
  artist_amount_cents: number;
  currency: string;
  earned_at: string;
  period_start: string | null;
  period_end: string | null;
  reference_type: string | null;
  reference_id: string | null;
};

type Payout = {
  id: string;
  amount_cents: number;
  currency: string;
  status: "pending" | "processing" | "paid" | "failed" | "cancelled";
  method_label: string | null;
  external_reference: string | null;
  note: string | null;
  requested_at: string | null;
  processed_at: string | null;
  created_at: string;
};

type EarningsResponse = {
  currencies?: CurrencySummary[];
  source_breakdown?: SourceBreakdown[];
  earnings?: Earning[];
  payouts?: Payout[];
  statement_years?: number[];
  error?: string;
};

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
    }).format(cents / 100);
  } catch {
    return `${currency} ${(cents / 100).toFixed(2)}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function sourceLabel(source: string) {
  if (source === "premium_license") return "Premium licensing";
  if (source === "bespoke") return "Bespoke";
  if (source === "subscription") return "Subscription library";
  if (source === "enterprise") return "Enterprise";
  if (source === "adjustment") return "Adjustment";
  return "Other";
}

function statusLabel(status: string) {
  return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");
}

function statusClassName(status: string) {
  if (status === "paid" || status === "available") {
    return "bg-[rgba(72,181,113,0.12)] text-[#48b571]";
  }
  if (status === "failed" || status === "void" || status === "cancelled") {
    return "bg-[rgba(220,88,79,0.12)] text-[var(--status-error,#dc584f)]";
  }
  return "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]";
}

function MetricCard({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="filmwave-backend-section flex min-h-[108px] flex-col justify-between p-4">
      <span className="text-xs font-[320] text-[var(--text-secondary)]">{label}</span>
      <div>
        <div className="font-[family-name:var(--font-zalando-sans)] text-[24px] font-[500] leading-none tracking-[-0.04em] text-[var(--text-primary)]">
          {value}
        </div>
        {note ? (
          <div className="mt-2 text-[10px] font-[320] text-[var(--text-muted)]">{note}</div>
        ) : null}
      </div>
    </div>
  );
}

export default function ArtistEarnings({ artistId }: { artistId: string }) {
  const [data, setData] = useState<EarningsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadEarnings() {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(`/api/artists/${artistId}/earnings`, {
          cache: "no-store",
        });
        const body = (await response.json().catch(() => null)) as
          | EarningsResponse
          | null;

        if (!response.ok) {
          throw new Error(body?.error || "Failed to load earnings");
        }

        if (!cancelled) setData(body || {});
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error ? loadError.message : "Failed to load earnings",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadEarnings();
    return () => {
      cancelled = true;
    };
  }, [artistId]);

  if (loading && !data) {
    return (
      <div className="filmwave-backend-section flex min-h-[280px] items-center justify-center text-xs font-[320] text-[var(--text-muted)]">
        Loading earnings...
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="filmwave-backend-section flex min-h-[280px] items-center justify-center px-5 text-center text-xs font-[320] text-[var(--status-error,#dc584f)]">
        {error}
      </div>
    );
  }

  const currencies = data?.currencies ?? [];
  const sourceBreakdown = data?.source_breakdown ?? [];
  const earnings = data?.earnings ?? [];
  const payouts = data?.payouts ?? [];
  const statementYears = data?.statement_years ?? [];
  const singleCurrency = currencies.length === 1 ? currencies[0] : null;
  const hasFinancialActivity = earnings.length > 0 || payouts.length > 0;

  return (
    <div className="grid gap-4">
      {error ? (
        <div className="filmwave-backend-section px-4 py-3 text-xs font-[320] text-[var(--status-error,#dc584f)]">
          {error}
        </div>
      ) : null}

      <section className="grid gap-2 sm:grid-cols-3">
        <MetricCard
          label="Available balance"
          value={
            singleCurrency
              ? formatMoney(singleCurrency.available_balance_cents, singleCurrency.currency)
              : currencies.length > 1
                ? "Multiple"
                : "—"
          }
          note={singleCurrency?.currency || (currencies.length > 1 ? "See balances below" : "No earnings recorded")}
        />
        <MetricCard
          label="Pending earnings"
          value={
            singleCurrency
              ? formatMoney(singleCurrency.pending_earnings_cents, singleCurrency.currency)
              : currencies.length > 1
                ? "Multiple"
                : "—"
          }
          note={singleCurrency?.currency || (currencies.length > 1 ? "See balances below" : "No pending earnings")}
        />
        <MetricCard
          label="Paid out"
          value={
            singleCurrency
              ? formatMoney(singleCurrency.paid_out_cents, singleCurrency.currency)
              : currencies.length > 1
                ? "Multiple"
                : "—"
          }
          note={singleCurrency?.currency || (currencies.length > 1 ? "See balances below" : "No payouts recorded")}
        />
      </section>

      {currencies.length > 1 ? (
        <section className="filmwave-backend-section overflow-hidden">
          <div className="filmwave-backend-section-header-bordered">
            <h2 className="filmwave-backend-section-title">Balances by currency</h2>
          </div>
          {currencies.map((summary, index) => (
            <div
              key={summary.currency}
              className={`grid gap-4 px-5 py-4 sm:grid-cols-4 ${
                index < currencies.length - 1 ? "border-b border-[var(--border-subtle)]" : ""
              }`}
            >
              <div className="text-xs font-[320] text-[var(--text-primary)]">
                {summary.currency}
              </div>
              <div className="text-xs font-[320] text-[var(--text-secondary)]">
                Available {formatMoney(summary.available_balance_cents, summary.currency)}
              </div>
              <div className="text-xs font-[320] text-[var(--text-secondary)]">
                Pending {formatMoney(summary.pending_earnings_cents, summary.currency)}
              </div>
              <div className="text-xs font-[320] text-[var(--text-secondary)]">
                Paid {formatMoney(summary.paid_out_cents, summary.currency)}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      <section className="filmwave-backend-section overflow-hidden">
        <div className="filmwave-backend-section-header-bordered">
          <h2 className="filmwave-backend-section-title">Earnings by source</h2>
        </div>
        {sourceBreakdown.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs font-[320] text-[var(--text-muted)]">
            No earnings have been recorded yet.
          </div>
        ) : (
          sourceBreakdown.map((item, index) => (
            <div
              key={`${item.source}-${item.currency}`}
              className={`flex items-center justify-between gap-4 px-5 py-4 ${
                index < sourceBreakdown.length - 1 ? "border-b border-[var(--border-subtle)]" : ""
              }`}
            >
              <span className="text-xs font-[320] text-[var(--text-primary)]">
                {sourceLabel(item.source)}
              </span>
              <span className="text-xs font-[500] text-[var(--text-primary)]">
                {formatMoney(item.amount_cents, item.currency)}
              </span>
            </div>
          ))
        )}
      </section>

      <section className="filmwave-backend-section overflow-hidden">
        <div className="filmwave-backend-section-header-bordered">
          <h2 className="filmwave-backend-section-title">Recent earnings</h2>
        </div>
        {earnings.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs font-[320] text-[var(--text-muted)]">
            Earnings will appear here when financial activity is recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-[120px_minmax(220px,1fr)_130px_130px] gap-4 border-b border-[var(--border-subtle)] px-5 py-3 text-[10px] font-[320] text-[var(--text-muted)]">
                <span>Date</span>
                <span>Source</span>
                <span>Status</span>
                <span className="text-right">Artist earnings</span>
              </div>
              {earnings.map((earning, index) => (
                <div
                  key={earning.id}
                  className={`grid min-h-[58px] grid-cols-[120px_minmax(220px,1fr)_130px_130px] items-center gap-4 px-5 py-3 ${
                    index < earnings.length - 1 ? "border-b border-[var(--border-subtle)]" : ""
                  }`}
                >
                  <span className="text-[11px] font-[320] text-[var(--text-secondary)]">
                    {formatDate(earning.earned_at)}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-xs font-[320] text-[var(--text-primary)]">
                      {earning.description || sourceLabel(earning.source)}
                    </div>
                    <div className="mt-1 text-[10px] font-[320] text-[var(--text-muted)]">
                      {sourceLabel(earning.source)} · {earning.currency}
                    </div>
                  </div>
                  <div>
                    <span className={`filmwave-backend-status-badge ${statusClassName(earning.status)}`}>
                      {statusLabel(earning.status)}
                    </span>
                  </div>
                  <span className="text-right text-xs font-[500] text-[var(--text-primary)]">
                    {formatMoney(earning.artist_amount_cents, earning.currency)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="filmwave-backend-section overflow-hidden">
        <div className="filmwave-backend-section-header-bordered">
          <h2 className="filmwave-backend-section-title">Payout history</h2>
        </div>
        {payouts.length === 0 ? (
          <div className="px-5 py-10 text-center text-xs font-[320] text-[var(--text-muted)]">
            No payouts have been recorded yet.
          </div>
        ) : (
          payouts.map((payout, index) => (
            <div
              key={payout.id}
              className={`grid gap-3 px-5 py-4 sm:grid-cols-[140px_minmax(0,1fr)_120px_120px] sm:items-center ${
                index < payouts.length - 1 ? "border-b border-[var(--border-subtle)]" : ""
              }`}
            >
              <span className="text-[11px] font-[320] text-[var(--text-secondary)]">
                {formatDate(payout.processed_at || payout.requested_at || payout.created_at)}
              </span>
              <div className="min-w-0">
                <div className="truncate text-xs font-[320] text-[var(--text-primary)]">
                  {payout.method_label || "Payout"}
                </div>
                {payout.external_reference ? (
                  <div className="mt-1 truncate text-[10px] font-[320] text-[var(--text-muted)]">
                    {payout.external_reference}
                  </div>
                ) : null}
              </div>
              <div>
                <span className={`filmwave-backend-status-badge ${statusClassName(payout.status)}`}>
                  {statusLabel(payout.status)}
                </span>
              </div>
              <span className="text-right text-xs font-[500] text-[var(--text-primary)]">
                {formatMoney(payout.amount_cents, payout.currency)}
              </span>
            </div>
          ))
        )}
      </section>

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header-bordered">
          <h2 className="filmwave-backend-section-title">Statements</h2>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-5">
          <div className="max-w-[620px] text-xs font-[320] leading-6 text-[var(--text-secondary)]">
            Download a CSV statement containing recorded earnings and payouts for a calendar year.
          </div>
          {statementYears.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {statementYears.map((year) => (
                <a
                  key={year}
                  href={`/api/artists/${artistId}/earnings/statement?year=${year}`}
                  className="filmwave-backend-button filmwave-backend-button-secondary"
                >
                  {year} CSV
                </a>
              ))}
            </div>
          ) : (
            <span className="text-xs font-[320] text-[var(--text-muted)]">No statements available yet.</span>
          )}
        </div>
      </section>

      <section className="filmwave-backend-section">
        <div className="filmwave-backend-section-header-bordered">
          <h2 className="filmwave-backend-section-title">Payout details</h2>
          <span className="filmwave-backend-status-badge bg-[var(--bg-tertiary)] text-[var(--text-secondary)]">
            Not connected
          </span>
        </div>
        <div className="px-5 py-5 text-xs font-[320] leading-6 text-[var(--text-secondary)]">
          Payout processing is not connected yet. Audioflume will not collect or store bank details here until a dedicated payout provider is integrated.
          {hasFinancialActivity ? " Existing payout records remain visible above." : ""}
        </div>
      </section>
    </div>
  );
}
