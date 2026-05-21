"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AccountFeedbackMessage, BillingFormState, LoadState, UserBillingProfile } from "../accountTypes";
import { billingToForm, emptyBillingForm } from "../accountUtils";

export function useBillingProfile() {
  const [billingProfile, setBillingProfile] = useState<UserBillingProfile | null>(null);
  const [form, setForm] = useState<BillingFormState>(emptyBillingForm);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<AccountFeedbackMessage | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBillingProfile() {
      setLoadState("loading");
      try {
        const response = await fetch("/api/account/billing-profile");
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Load failed");
        if (!active) return;
        setBillingProfile(payload.billingProfile);
        setForm(billingToForm(payload.billingProfile));
        setLoadState("ready");
      } catch (error) {
        console.error(error);
        if (!active) return;
        setLoadState("error");
        setMessage({ tone: "error", text: "Could not load billing details." });
      }
    }

    loadBillingProfile();
    return () => {
      active = false;
    };
  }, []);

  const billingChanged = useMemo(() => JSON.stringify(form) !== JSON.stringify(billingToForm(billingProfile)), [form, billingProfile]);

  async function saveBillingProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/billing-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Save failed");
      setBillingProfile(payload.billingProfile);
      setForm(billingToForm(payload.billingProfile));
      setMessage({ tone: "success", text: "Billing details saved." });
    } catch (error) {
      console.error(error);
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Billing details could not be saved." });
    } finally {
      setSaving(false);
    }
  }

  return {
    billingProfile,
    form,
    setForm,
    loadState,
    saving,
    message,
    billingChanged,
    saveBillingProfile,
    resetBillingForm: () => setForm(billingToForm(billingProfile)),
  };
}
