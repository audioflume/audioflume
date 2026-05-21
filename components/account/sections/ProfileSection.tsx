"use client";

import { useUser } from "@clerk/nextjs";
import { Button, Card, CardTitle, Feedback, Info, Input, ProfileImageUploader } from "../AccountUI";
import { useAccountProfile } from "../hooks/useAccountProfile";
import { formatDate } from "../accountUtils";

export default function ProfileSection() {
  const { user } = useUser();
  const {
    profile,
    identityEmail,
    form,
    setForm,
    loadState,
    saving,
    message,
    profileChanged,
    saveProfile,
    resetProfileForm,
  } = useAccountProfile();

  const fullName = form.display_name || user?.fullName || "Filmwave Member";
  const email = identityEmail || user?.primaryEmailAddress?.emailAddress || "No email on file";
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardTitle
          title="Personal information"
          description={loadState === "loading" ? "Loading your saved profile..." : "Basic details shown across your account and future customer portal."}
        />
        <form onSubmit={saveProfile}>
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Input label="First name" value={form.first_name} placeholder="First name" onChange={(value) => setForm((current) => ({ ...current, first_name: value }))} />
            <Input label="Last name" value={form.last_name} placeholder="Last name" onChange={(value) => setForm((current) => ({ ...current, last_name: value }))} />
            <Input label="Display name" value={form.display_name} placeholder="Display name" onChange={(value) => setForm((current) => ({ ...current, display_name: value }))} />
            <Input label="Email address" value={email} readOnly />
            <Input label="Company / studio" value={form.company_name} placeholder="Add company name" onChange={(value) => setForm((current) => ({ ...current, company_name: value }))} />
            <Input label="Primary use" value={form.primary_use} placeholder="Documentary, commercial, YouTube..." onChange={(value) => setForm((current) => ({ ...current, primary_use: value }))} />
          </div>
          <div className="grid gap-3 border-t border-[var(--border)] px-4 py-3.5">
            {message ? <Feedback tone={message.tone} message={message.text} /> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={saving || !profileChanged || loadState === "loading"}>{saving ? "Saving..." : "Save changes"}</Button>
              <Button subtle disabled={saving || !profileChanged} onClick={resetProfileForm}>Cancel</Button>
            </div>
          </div>
        </form>
      </Card>

      <Card>
        <div className="border-b border-[var(--border)] p-4">
          <div className="flex items-center gap-5">
            <ProfileImageUploader initials={initials} value={form.avatar_url} onChange={(value) => setForm((current) => ({ ...current, avatar_url: value }))} />
            <div className="min-w-0">
              <div className="truncate text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">{fullName}</div>
              <div className="mt-1 truncate text-xs text-[var(--text-muted)]">{email}</div>
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-4">
          <Info label="Account type" value="Filmwave Member" />
          <Info label="Company / studio" value={form.company_name || "Not set"} />
          <Info label="Member since" value={formatDate(profile?.created_at)} />
        </div>
      </Card>
    </div>
  );
}
