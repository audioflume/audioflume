"use client";

import { useUser } from "@clerk/nextjs";
import { Button, Card, CardTitle, Feedback, Input } from "../AccountUI";
import { billingToForm } from "../accountUtils";
import { useBillingProfile } from "../hooks/useBillingProfile";

export default function PaymentSection() {
  const { user } = useUser();
  const {
    billingProfile,
    form,
    setForm,
    loadState,
    saving,
    message,
    billingChanged,
    saveBillingProfile,
    resetBillingForm,
  } = useBillingProfile();

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardTitle title="Payment method" description="Card data should be handled through Stripe, not stored in Supabase." />
          <div className="p-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">Stripe customer portal not connected yet</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    Customer ID: {billingProfile?.stripe_customer_id || "Not created"}
                  </div>
                </div>
                <div className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                  Stripe-ready
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button subtle>Connect Stripe later</Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardTitle
            title="Billing details"
            description={loadState === "loading" ? "Loading billing details..." : "Invoice contact and tax details for receipts."}
          />
          <form onSubmit={saveBillingProfile}>
            <div className="grid gap-4 p-4">
              <Input label="Billing email" type="email" value={form.billing_email || user?.primaryEmailAddress?.emailAddress || ""} onChange={(value) => setForm((current) => ({ ...current, billing_email: value }))} />
              <Input label="Business name" value={form.business_name} placeholder="Company or studio" onChange={(value) => setForm((current) => ({ ...current, business_name: value }))} />
              <Input label="Tax ID" value={form.tax_id} placeholder="Optional" onChange={(value) => setForm((current) => ({ ...current, tax_id: value }))} />
              <Input label="Country" value={form.country} placeholder="Canada" onChange={(value) => setForm((current) => ({ ...current, country: value }))} />
              <Input label="Province / state" value={form.province_state} placeholder="British Columbia" onChange={(value) => setForm((current) => ({ ...current, province_state: value }))} />
            </div>
            <div className="grid gap-3 border-t border-[var(--border)] px-4 py-3.5">
              {message ? <Feedback tone={message.tone} message={message.text} /> : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={saving || !billingChanged || loadState === "loading"}>{saving ? "Saving..." : "Save billing details"}</Button>
                <Button subtle disabled={saving || !billingChanged} onClick={resetBillingForm}>Cancel</Button>
              </div>
            </div>
          </form>
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle title="Recent invoices" description="Invoices will come from Stripe once subscriptions are connected." />
        <div className="px-4 py-6 text-sm text-[var(--text-muted)]">No Stripe invoices are connected yet.</div>
      </Card>
    </>
  );
}
