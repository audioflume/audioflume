"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type { AccountFeedbackMessage, LoadState, ProfileFormState, UserProfile } from "../accountTypes";
import { emptyProfileForm, profileToForm } from "../accountUtils";

export function useAccountProfile() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [identityEmail, setIdentityEmail] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyProfileForm);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<AccountFeedbackMessage | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoadState("loading");
      try {
        const response = await fetch("/api/account/profile");
        const payload = await response.json();
        if (!response.ok) throw new Error(payload?.error || "Load failed");
        if (!active) return;
        setProfile(payload.profile);
        setIdentityEmail(payload.identity?.email ?? null);
        setForm(profileToForm(payload.profile));
        setLoadState("ready");
      } catch (error) {
        console.error(error);
        if (!active) return;
        setLoadState("error");
        setMessage({ tone: "error", text: "Could not load profile." });
      }
    }

    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const profileChanged = useMemo(() => JSON.stringify(form) !== JSON.stringify(profileToForm(profile)), [form, profile]);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.error || "Save failed");
      setProfile(payload.profile);
      setForm(profileToForm(payload.profile));
      setMessage({ tone: "success", text: "Profile saved." });
    } catch (error) {
      console.error(error);
      setMessage({ tone: "error", text: error instanceof Error ? error.message : "Profile could not be saved." });
    } finally {
      setSaving(false);
    }
  }

  return {
    profile,
    identityEmail,
    form,
    setForm,
    loadState,
    saving,
    message,
    profileChanged,
    saveProfile,
    resetProfileForm: () => setForm(profileToForm(profile)),
  };
}
