"use client";

import { useUser } from "@clerk/nextjs";
import { Button, Feedback, Input, ProfileImageUploader } from "../AccountUI";
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

  const fullName = form.display_name || user?.fullName || "Audioflume Member";
  const email = identityEmail || user?.primaryEmailAddress?.emailAddress || "No email on file";
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="max-w-[860px]">
      <section className="flex items-center gap-5 rounded-[14px] bg-[var(--filmwave-white)] p-5">
        <ProfileImageUploader
          initials={initials}
          value={form.avatar_url}
          onChange={(value) =>
            setForm((current) => ({ ...current, avatar_url: value }))
          }
        />
        <div className="min-w-0">
          <div className="truncate font-[family-name:var(--font-aktiv-grotesk)] text-[20px] font-medium tracking-[-0.035em] text-[var(--text-primary)]">
            {fullName}
          </div>
          <div className="mt-1 truncate text-[13px] text-[var(--text-muted)]">
            {email}
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="mb-6">
          <h2 className="font-[family-name:var(--font-aktiv-grotesk)] text-[18px] font-medium tracking-[-0.03em] text-[var(--text-primary)]">
            Personal information
          </h2>
        </div>

        <form onSubmit={saveProfile}>
          <div className="grid gap-x-5 gap-y-5 sm:grid-cols-2">
            <Input
              label="First name"
              value={form.first_name}
              placeholder="First name"
              onChange={(value) =>
                setForm((current) => ({ ...current, first_name: value }))
              }
            />
            <Input
              label="Last name"
              value={form.last_name}
              placeholder="Last name"
              onChange={(value) =>
                setForm((current) => ({ ...current, last_name: value }))
              }
            />
            <Input
              label="Display name"
              value={form.display_name}
              placeholder="Display name"
              onChange={(value) =>
                setForm((current) => ({ ...current, display_name: value }))
              }
            />
            <Input label="Email address" value={email} readOnly />
            <Input
              label="Company / studio"
              value={form.company_name}
              placeholder="Add company name"
              onChange={(value) =>
                setForm((current) => ({ ...current, company_name: value }))
              }
            />
            <Input
              label="Primary use"
              value={form.primary_use}
              placeholder="Documentary, commercial, YouTube..."
              onChange={(value) =>
                setForm((current) => ({ ...current, primary_use: value }))
              }
            />
          </div>

          <div className="mt-6 grid gap-3">
            {message ? (
              <Feedback tone={message.tone} message={message.text} />
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={saving || !profileChanged || loadState === "loading"}
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <Button
                subtle
                disabled={saving || !profileChanged}
                onClick={resetProfileForm}
              >
                Cancel
              </Button>
            </div>
          </div>
        </form>
      </section>

      <section className="pt-2">
        <div className="mb-4">
          <h2 className="font-[family-name:var(--font-aktiv-grotesk)] text-[18px] font-medium tracking-[-0.03em] text-[var(--text-primary)]">
            Account details
          </h2>
        </div>

        <dl className="border-t border-[var(--border)]">
          <div className="grid gap-1 border-b border-[var(--border)] py-4 sm:grid-cols-[180px_1fr] sm:items-center">
            <dt className="text-[12px] text-[var(--text-muted)]">Account type</dt>
            <dd className="text-[13px] font-medium text-[var(--text-primary)]">
              Audioflume Member
            </dd>
          </div>
          <div className="grid gap-1 border-b border-[var(--border)] py-4 sm:grid-cols-[180px_1fr] sm:items-center">
            <dt className="text-[12px] text-[var(--text-muted)]">Company / studio</dt>
            <dd className="text-[13px] font-medium text-[var(--text-primary)]">
              {form.company_name || "Not set"}
            </dd>
          </div>
          <div className="grid gap-1 border-b border-[var(--border)] py-4 sm:grid-cols-[180px_1fr] sm:items-center">
            <dt className="text-[12px] text-[var(--text-muted)]">Member since</dt>
            <dd className="text-[13px] font-medium text-[var(--text-primary)]">
              {formatDate(profile?.created_at)}
            </dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
