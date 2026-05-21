"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTheme } from "@/context/ThemeContext";
import {
  useUserPreferences,
  type PlaylistSortMode,
  type PlaylistViewMode,
  type SidebarProjectSortMode,
  type ThemeMode,
} from "@/context/UserPreferencesContext";

type AccountSection =
  | "profile"
  | "settings"
  | "membership"
  | "payment"
  | "security"
  | "support";

type AccountSettingsPageProps = {
  section: AccountSection;
};

type UserProfile = {
  clerk_user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  company_name: string | null;
  primary_use: string | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
};

type UserBillingProfile = {
  clerk_user_id: string;
  billing_email: string | null;
  business_name: string | null;
  tax_id: string | null;
  country: string | null;
  province_state: string | null;
  stripe_customer_id: string | null;
  created_at?: string;
  updated_at?: string;
};

type UserMembership = {
  clerk_user_id: string;
  plan_key: string;
  status: string;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  license_label: string;
  download_limit: number | null;
  downloads_used: number;
  created_at?: string;
  updated_at?: string;
};

type MembershipDisplay = {
  plan_label: string;
  status_label: string;
  renewal_label: string;
  downloads_label: string;
};

type UsageSnapshot = {
  playlists: number;
  projects: number;
  favorites: number;
  downloads: number;
};

type SecurityEvent = {
  id: number;
  event_type: string;
  description: string | null;
  location_label: string | null;
  created_at: string;
};

type LoadState = "idle" | "loading" | "ready" | "error";

type ProfileFormState = {
  first_name: string;
  last_name: string;
  display_name: string;
  company_name: string;
  primary_use: string;
  avatar_url: string;
};

type BillingFormState = {
  billing_email: string;
  business_name: string;
  tax_id: string;
  country: string;
  province_state: string;
};

const emptyProfileForm: ProfileFormState = {
  first_name: "",
  last_name: "",
  display_name: "",
  company_name: "",
  primary_use: "",
  avatar_url: "",
};

const emptyBillingForm: BillingFormState = {
  billing_email: "",
  business_name: "",
  tax_id: "",
  country: "",
  province_state: "",
};

const accountNav: {
  href: string;
  section: AccountSection;
  label: string;
  helper: string;
}[] = [
  {
    href: "/account/profile",
    section: "profile",
    label: "Profile",
    helper: "User details",
  },
  {
    href: "/account/settings",
    section: "settings",
    label: "Settings",
    helper: "Site preferences",
  },
  {
    href: "/account/membership",
    section: "membership",
    label: "Membership",
    helper: "Plan and usage",
  },
  {
    href: "/account/payment",
    section: "payment",
    label: "Payment",
    helper: "Billing method",
  },
  {
    href: "/account/security",
    section: "security",
    label: "Security",
    helper: "Password and access",
  },
  {
    href: "/account/support",
    section: "support",
    label: "Support & FAQ",
    helper: "Help center",
  },
];

function toInputValue(value: string | null | undefined) {
  return value ?? "";
}

function profileToForm(profile: UserProfile | null): ProfileFormState {
  return {
    first_name: toInputValue(profile?.first_name),
    last_name: toInputValue(profile?.last_name),
    display_name: toInputValue(profile?.display_name),
    company_name: toInputValue(profile?.company_name),
    primary_use: toInputValue(profile?.primary_use),
    avatar_url: toInputValue(profile?.avatar_url),
  };
}

function billingToForm(billingProfile: UserBillingProfile | null): BillingFormState {
  return {
    billing_email: toInputValue(billingProfile?.billing_email),
    business_name: toInputValue(billingProfile?.business_name),
    tax_id: toInputValue(billingProfile?.tax_id),
    country: toInputValue(billingProfile?.country),
    province_state: toInputValue(billingProfile?.province_state),
  };
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatCount(value: number, label: string) {
  return `${value} ${label}${value === 1 ? "" : "s"}`;
}

function ArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M9 6L15 12L9 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 6L9 17L4 12"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-5 border-b border-[var(--border)] pb-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--text-muted)]">
        {eyebrow}
      </div>
      <h1 className="mt-2 text-[32px] font-semibold leading-none tracking-[-0.055em] text-[var(--text-primary)] md:text-[40px]">
        {title}
      </h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
  );
}

function AccountCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] ${className}`}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-[var(--border)] px-4 py-3.5">
      <h2 className="text-sm font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
        {title}
      </h2>
      {description ? (
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function FieldDisplay({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3.5 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  placeholder,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </span>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm font-medium text-[var(--text-primary)] outline-none transition placeholder:font-normal placeholder:text-[var(--text-muted)] focus:border-[var(--accent-2)]"
      />
    </label>
  );
}

function PrimaryButton({
  children,
  disabled = false,
  type = "button",
}: {
  children: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      className="h-8 cursor-pointer rounded-lg bg-[var(--accent)] px-3.5 text-xs font-semibold text-[var(--accent-contrast)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function SecondaryButton({
  children,
  disabled = false,
  type = "button",
  onClick,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="h-8 cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover-strong)] disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function OptionButton<T extends string>({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: T;
  active: boolean;
  onClick: (value: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg px-3 text-xs font-medium transition ${
        active
          ? "bg-[var(--accent-2)] text-[var(--accent-2-contrast)]"
          : "border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]"
      }`}
    >
      {active ? <CheckIcon /> : null}
      {label}
    </button>
  );
}

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 border-b border-[var(--border-subtle)] px-4 py-4 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <div className="text-sm font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          {title}
        </div>
        <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--text-muted)]">
          {description}
        </p>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">{children}</div>
    </div>
  );
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex h-7 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 text-xs">
      <span className="text-[var(--text-muted)]">{label}</span>
      <span className="font-semibold text-[var(--text-primary)]">{value}</span>
    </div>
  );
}

function FeedbackMessage({ message, tone }: { message: string; tone: "success" | "error" }) {
  return (
    <div
      className={`rounded-xl border px-3 py-2 text-xs ${
        tone === "success"
          ? "border-[rgba(72,181,113,0.35)] bg-[rgba(72,181,113,0.08)] text-[#48b571]"
          : "border-[rgba(220,88,79,0.35)] bg-[rgba(220,88,79,0.08)] text-[#dc584f]"
      }`}
    >
      {message}
    </div>
  );
}

function ProfileSection() {
  const { user } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [identityEmail, setIdentityEmail] = useState<string | null>(null);
  const [form, setForm] = useState<ProfileFormState>(emptyProfileForm);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoadState("loading");

      try {
        const response = await fetch("/api/account/profile");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load profile");
        }

        if (!active) return;

        setProfile(payload.profile);
        setIdentityEmail(payload.identity?.email ?? null);
        setForm(profileToForm(payload.profile));
        setLoadState("ready");
      } catch (error) {
        console.error(error);
        if (!active) return;
        setLoadState("error");
        setMessage({ tone: "error", text: "Could not load your profile." });
      }
    }

    loadProfile();

    return () => {
      active = false;
    };
  }, []);

  const fullName = form.display_name || user?.fullName || "Filmwave Member";
  const email = identityEmail || user?.primaryEmailAddress?.emailAddress || "No email on file";
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const profileChanged = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(profileToForm(profile));
  }, [form, profile]);

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

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save profile");
      }

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

  return (
    <>
      <SectionHeader
        eyebrow="Account"
        title="Profile"
        description="Manage the personal information attached to your Filmwave account. Identity and login details still come from Clerk; Filmwave-specific profile details are saved to Supabase."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <AccountCard>
          <CardHeader
            title="Personal information"
            description={loadState === "loading" ? "Loading your saved profile..." : "Core account details used for billing, support, and saved library activity."}
          />
          <form onSubmit={saveProfile}>
            <div className="grid gap-4 p-4 sm:grid-cols-2">
              <TextInput label="First name" value={form.first_name} placeholder="First name" onChange={(value) => setForm((current) => ({ ...current, first_name: value }))} />
              <TextInput label="Last name" value={form.last_name} placeholder="Last name" onChange={(value) => setForm((current) => ({ ...current, last_name: value }))} />
              <TextInput label="Display name" value={form.display_name} placeholder="Display name" onChange={(value) => setForm((current) => ({ ...current, display_name: value }))} />
              <TextInput label="Email address" value={email} onChange={() => undefined} />
              <TextInput label="Company / studio" value={form.company_name} placeholder="Add company name" onChange={(value) => setForm((current) => ({ ...current, company_name: value }))} />
              <TextInput label="Primary use" value={form.primary_use} placeholder="Documentary, commercial, YouTube..." onChange={(value) => setForm((current) => ({ ...current, primary_use: value }))} />
            </div>
            <div className="grid gap-3 border-t border-[var(--border)] px-4 py-3.5">
              {message ? <FeedbackMessage tone={message.tone} message={message.text} /> : null}
              <div className="flex flex-wrap gap-2">
                <PrimaryButton type="submit" disabled={saving || !profileChanged || loadState === "loading"}>
                  {saving ? "Saving..." : "Save profile"}
                </PrimaryButton>
                <SecondaryButton disabled={saving || !profileChanged} onClick={() => setForm(profileToForm(profile))}>
                  Cancel changes
                </SecondaryButton>
              </div>
            </div>
          </form>
        </AccountCard>

        <AccountCard>
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm font-semibold text-[var(--text-primary)]">
                {form.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials || "FW"
                )}
              </div>
              <div className="min-w-0">
                <div className="truncate text-base font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  {fullName}
                </div>
                <div className="mt-1 truncate text-xs text-[var(--text-muted)]">
                  {email}
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-3 p-4">
            <FieldDisplay label="Account type" value="Filmwave Member" />
            <FieldDisplay label="Company / studio" value={form.company_name || "Not set"} />
            <FieldDisplay label="Member since" value={formatDate(profile?.created_at)} />
          </div>
        </AccountCard>
      </div>
    </>
  );
}

function SettingsSection() {
  const { theme, setTheme } = useTheme();
  const {
    playlistViewMode,
    setPlaylistViewMode,
    playlistSortMode,
    setPlaylistSortMode,
    sidebarProjectSortMode,
    setSidebarProjectSortMode,
    preferencesLoaded,
  } = useUserPreferences();

  return (
    <>
      <SectionHeader
        eyebrow="Preferences"
        title="Settings"
        description="Global site settings stored in Supabase. These controls use your existing user preferences context and API route."
      />

      <AccountCard>
        <CardHeader
          title="Global site preferences"
          description={preferencesLoaded ? "Preferences loaded from your account." : "Loading saved preferences..."}
        />

        <SettingRow
          title="Theme"
          description="Controls the light or dark appearance of Filmwave across the full app."
        >
          <OptionButton<ThemeMode> label="Dark" value="dark" active={theme === "dark"} onClick={() => setTheme("dark")} />
          <OptionButton<ThemeMode> label="Light" value="light" active={theme === "light"} onClick={() => setTheme("light")} />
        </SettingRow>

        <SettingRow
          title="Playlist view"
          description="Sets the default visual layout for your personal playlist library."
        >
          <OptionButton<PlaylistViewMode> label="Grid" value="grid" active={playlistViewMode === "grid"} onClick={() => setPlaylistViewMode("grid")} />
          <OptionButton<PlaylistViewMode> label="List" value="list" active={playlistViewMode === "list"} onClick={() => setPlaylistViewMode("list")} />
        </SettingRow>

        <SettingRow
          title="Playlist sorting"
          description="Choose whether playlists hold your custom drag order or stay alphabetical."
        >
          <OptionButton<PlaylistSortMode> label="Custom" value="custom" active={playlistSortMode === "custom"} onClick={() => setPlaylistSortMode("custom")} />
          <OptionButton<PlaylistSortMode> label="Alphabetical" value="alphabetical" active={playlistSortMode === "alphabetical"} onClick={() => setPlaylistSortMode("alphabetical")} />
        </SettingRow>

        <SettingRow
          title="Sidebar project sorting"
          description="Controls how user projects are ordered inside the main app sidebar."
        >
          <OptionButton<SidebarProjectSortMode> label="Custom" value="custom" active={sidebarProjectSortMode === "custom"} onClick={() => setSidebarProjectSortMode("custom")} />
          <OptionButton<SidebarProjectSortMode> label="Alphabetical" value="alphabetical" active={sidebarProjectSortMode === "alphabetical"} onClick={() => setSidebarProjectSortMode("alphabetical")} />
        </SettingRow>
      </AccountCard>
    </>
  );
}

function MembershipSection() {
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [display, setDisplay] = useState<MembershipDisplay | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");

  useEffect(() => {
    let active = true;

    async function loadMembership() {
      setLoadState("loading");

      try {
        const [membershipResponse, usageResponse] = await Promise.all([
          fetch("/api/account/membership"),
          fetch("/api/account/usage"),
        ]);

        const membershipPayload = await membershipResponse.json();
        const usagePayload = await usageResponse.json();

        if (!membershipResponse.ok) {
          throw new Error(membershipPayload?.error || "Failed to load membership");
        }

        if (!usageResponse.ok) {
          throw new Error(usagePayload?.error || "Failed to load usage");
        }

        if (!active) return;

        setMembership(membershipPayload.membership);
        setDisplay(membershipPayload.display);
        setUsage(usagePayload.usage);
        setLoadState("ready");
      } catch (error) {
        console.error(error);
        if (!active) return;
        setLoadState("error");
      }
    }

    loadMembership();

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <SectionHeader
        eyebrow="Subscription"
        title="Membership"
        description="A clear overview of plan status, licensing, usage, and future upgrade paths for Filmwave members."
      />

      {loadState === "error" ? (
        <div className="mb-4">
          <FeedbackMessage tone="error" message="Could not load membership details. Make sure the account SQL has been run in Supabase." />
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <AccountCard>
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                  Current plan
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                  {display?.plan_label || "Loading membership..."}
                </div>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                  {membership?.license_label || "Your Filmwave membership controls library access, playlist tools, and commercial licensing."}
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent)]">
                {display?.status_label || "Loading"}
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-3">
            <FieldDisplay label="Renewal" value={display?.renewal_label || "Loading"} />
            <FieldDisplay label="Downloads" value={display?.downloads_label || "Loading"} />
            <FieldDisplay label="License" value={membership?.license_label || "Loading"} />
          </div>
        </AccountCard>

        <AccountCard>
          <CardHeader title="Usage snapshot" description="Live usage signals from your Filmwave account." />
          <div className="grid gap-3 p-4">
            <FieldDisplay label="Songs downloaded" value={formatCount(usage?.downloads ?? 0, "download")} />
            <FieldDisplay label="Projects created" value={formatCount(usage?.projects ?? 0, "project")} />
            <FieldDisplay label="Favorite tracks" value={formatCount(usage?.favorites ?? 0, "saved track")} />
            <FieldDisplay label="Playlists" value={formatCount(usage?.playlists ?? 0, "playlist")} />
          </div>
        </AccountCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {[
          ["Starter", "$15 CAD / mo", "For solo creators who need a focused commercial music library."],
          ["Studio", "$39 CAD / mo", "For teams needing multiple seats, shared playlists, and priority support."],
          ["Enterprise", "Custom", "For agencies, networks, and higher-volume commercial usage."],
        ].map(([name, price, description]) => (
          <AccountCard key={name} className="p-4">
            <div className="text-sm font-semibold text-[var(--text-primary)]">{name}</div>
            <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
              {price}
            </div>
            <p className="mt-2 min-h-[56px] text-xs leading-5 text-[var(--text-muted)]">
              {description}
            </p>
            <div className="mt-4">
              <SecondaryButton>{name === "Enterprise" ? "Contact sales" : "Coming soon"}</SecondaryButton>
            </div>
          </AccountCard>
        ))}
      </div>
    </>
  );
}

function PaymentSection() {
  const { user } = useUser();
  const [billingProfile, setBillingProfile] = useState<UserBillingProfile | null>(null);
  const [form, setForm] = useState<BillingFormState>(emptyBillingForm);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    let active = true;

    async function loadBillingProfile() {
      setLoadState("loading");

      try {
        const response = await fetch("/api/account/billing-profile");
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load billing profile");
        }

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

  const billingChanged = useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(billingToForm(billingProfile));
  }, [form, billingProfile]);

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

      if (!response.ok) {
        throw new Error(payload?.error || "Failed to save billing details");
      }

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

  return (
    <>
      <SectionHeader
        eyebrow="Billing"
        title="Payment"
        description="Manage invoice contact details now. Payment methods and invoices are prepared for Stripe, but real card management should be handled by Stripe Checkout or the Stripe customer portal."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <AccountCard>
          <CardHeader title="Payment method" description="Safe billing status. Card data should live in Stripe, not Supabase." />
          <div className="p-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    Stripe customer portal not connected yet
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    Customer ID: {billingProfile?.stripe_customer_id || "Not created"}
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                  Stripe-ready
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <SecondaryButton>Connect Stripe later</SecondaryButton>
            </div>
          </div>
        </AccountCard>

        <AccountCard>
          <CardHeader title="Billing details" description="Invoice contact and tax details for receipts." />
          <form onSubmit={saveBillingProfile}>
            <div className="grid gap-4 p-4">
              <TextInput label="Billing email" value={form.billing_email || user?.primaryEmailAddress?.emailAddress || ""} type="email" onChange={(value) => setForm((current) => ({ ...current, billing_email: value }))} />
              <TextInput label="Business name" value={form.business_name} placeholder="Company or studio" onChange={(value) => setForm((current) => ({ ...current, business_name: value }))} />
              <TextInput label="Tax ID" value={form.tax_id} placeholder="Optional" onChange={(value) => setForm((current) => ({ ...current, tax_id: value }))} />
              <TextInput label="Country" value={form.country} placeholder="Canada" onChange={(value) => setForm((current) => ({ ...current, country: value }))} />
              <TextInput label="Province / state" value={form.province_state} placeholder="British Columbia" onChange={(value) => setForm((current) => ({ ...current, province_state: value }))} />
            </div>
            <div className="grid gap-3 border-t border-[var(--border)] px-4 py-3.5">
              {message ? <FeedbackMessage tone={message.tone} message={message.text} /> : null}
              <div className="flex flex-wrap gap-2">
                <PrimaryButton type="submit" disabled={saving || !billingChanged || loadState === "loading"}>
                  {saving ? "Saving..." : "Save billing details"}
                </PrimaryButton>
                <SecondaryButton disabled={saving || !billingChanged} onClick={() => setForm(billingToForm(billingProfile))}>
                  Cancel changes
                </SecondaryButton>
              </div>
            </div>
          </form>
        </AccountCard>
      </div>

      <AccountCard className="mt-4">
        <CardHeader title="Recent invoices" description="Invoices will come from Stripe once subscriptions are connected." />
        <div className="px-4 py-6 text-sm text-[var(--text-muted)]">
          No Stripe invoices are connected yet.
        </div>
      </AccountCard>
    </>
  );
}

function SecuritySection() {
  const { user } = useUser();
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const email = user?.primaryEmailAddress?.emailAddress || "Primary email";

  useEffect(() => {
    let active = true;

    async function loadEvents() {
      try {
        const response = await fetch("/api/account/security-events");
        const payload = await response.json();

        if (!active) return;
        setEvents(Array.isArray(payload.events) ? payload.events : []);
      } catch (error) {
        console.error(error);
        if (!active) return;
        setEvents([]);
      }
    }

    loadEvents();

    return () => {
      active = false;
    };
  }, []);

  return (
    <>
      <SectionHeader
        eyebrow="Access"
        title="Security"
        description="Password, email recovery, sessions, and account protection for Filmwave sign-in access. Secure identity controls are handled by Clerk."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <AccountCard>
          <CardHeader title="Sign-in security" description="Use Clerk account controls for password, 2FA, and active sessions." />
          <div className="divide-y divide-[var(--border-subtle)]">
            <SettingRow title="Password" description="Change the password used to access your Filmwave account through Clerk.">
              <SecondaryButton>Managed by Clerk</SecondaryButton>
            </SettingRow>
            <SettingRow title="Two-factor authentication" description="Add an extra layer of protection from your Clerk user profile.">
              <SecondaryButton>Managed by Clerk</SecondaryButton>
            </SettingRow>
            <SettingRow title="Backup email" description="Use Clerk to manage recovery and verified email addresses.">
              <SecondaryButton>Managed by Clerk</SecondaryButton>
            </SettingRow>
          </div>
        </AccountCard>

        <AccountCard>
          <CardHeader title="Account access" description="Current verified contact and identity status from Clerk." />
          <div className="grid gap-3 p-4">
            <FieldDisplay label="Primary email" value={email} />
            <FieldDisplay label="Email status" value={user?.primaryEmailAddress?.verification?.status || "Unknown"} />
            <FieldDisplay label="User ID" value={user?.id || "Unavailable"} />
          </div>
        </AccountCard>
      </div>

      <AccountCard className="mt-4">
        <CardHeader title="Recent security events" description="Lightweight Filmwave-side audit trail. Clerk remains the source of truth for auth sessions." />
        <div className="divide-y divide-[var(--border-subtle)]">
          {events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="grid gap-1 px-4 py-3.5 sm:grid-cols-[1fr_auto]">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">{event.event_type}</div>
                  {event.description ? (
                    <div className="mt-1 text-xs text-[var(--text-muted)]">{event.description}</div>
                  ) : null}
                </div>
                <div className="text-xs text-[var(--text-muted)]">
                  {event.location_label || "Filmwave"} · {formatDate(event.created_at)}
                </div>
              </div>
            ))
          ) : (
            <div className="px-4 py-6 text-sm text-[var(--text-muted)]">
              No Filmwave security events yet.
            </div>
          )}
        </div>
      </AccountCard>
    </>
  );
}

function SupportSection() {
  const faqs = [
    [
      "Can I use Filmwave songs in client work?",
      "Yes. Filmwave is structured for royalty-free commercial project use. Final legal copy should be connected to your real license terms before launch.",
    ],
    [
      "Can I download stems?",
      "Tracks that include stems can expose them directly from the song card or player menu, depending on how the library item is configured.",
    ],
    [
      "What happens if I cancel my membership?",
      "This mockup assumes previously licensed work remains covered, while future downloads require an active plan. Confirm this against your final licensing model.",
    ],
    [
      "How do I report a missing waveform or broken file?",
      "Submit a support ticket with the song title and the issue type. This layout leaves room for a future ticket form or Intercom-style portal.",
    ],
  ];

  return (
    <>
      <SectionHeader
        eyebrow="Help"
        title="Support & FAQ"
        description="Contact portals, ticket options, documentation links, and common account questions in a single support workspace."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          ["Submit a ticket", "Send a detailed issue report for billing, song files, downloads, licensing, or account problems.", "Start ticket"],
          ["Contact support", "Reach the Filmwave team directly for account questions or help using the library.", "Email support"],
          ["License help", "Find answers about commercial usage, client projects, social ads, and broadcast-style work.", "View license guide"],
        ].map(([title, description, action]) => (
          <AccountCard key={title} className="p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--accent-2)]">
              <ArrowIcon />
            </div>
            <div className="mt-4 text-sm font-semibold text-[var(--text-primary)]">{title}</div>
            <p className="mt-2 min-h-[66px] text-xs leading-5 text-[var(--text-muted)]">
              {description}
            </p>
            <div className="mt-4">
              <SecondaryButton>{action}</SecondaryButton>
            </div>
          </AccountCard>
        ))}
      </div>

      <AccountCard className="mt-4">
        <CardHeader title="Frequently asked questions" description="Common questions users will look for inside account support." />
        <div className="divide-y divide-[var(--border-subtle)]">
          {faqs.map(([question, answer]) => (
            <div key={question} className="px-4 py-3.5">
              <div className="text-sm font-semibold text-[var(--text-primary)]">{question}</div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{answer}</p>
            </div>
          ))}
        </div>
      </AccountCard>
    </>
  );
}

function PageContent({ section }: { section: AccountSection }) {
  if (section === "profile") return <ProfileSection />;
  if (section === "settings") return <SettingsSection />;
  if (section === "membership") return <MembershipSection />;
  if (section === "payment") return <PaymentSection />;
  if (section === "security") return <SecuritySection />;
  return <SupportSection />;
}

export default function AccountSettingsPage({ section }: AccountSettingsPageProps) {
  const pathname = usePathname();
  const activeNav = accountNav.find((item) => item.section === section);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] px-4 pb-24 pt-[88px] text-[var(--text-primary)] md:pl-[calc(var(--sidebar-width,240px)+24px)] md:pr-6">
      <div className="mx-auto max-w-[1320px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--text-muted)]">
              Filmwave Account
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusPill label="Section" value={activeNav?.label || "Account"} />
              <StatusPill label="Status" value="Connected" />
            </div>
          </div>
          <Link
            href="/music"
            className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover-strong)]"
          >
            Back to music
          </Link>
        </div>

        <div className="grid gap-5 lg:grid-cols-[260px_1fr] lg:items-start">
          <aside className="lg:sticky lg:top-[88px]">
            <AccountCard>
              <div className="border-b border-[var(--border)] px-4 py-3.5">
                <div className="text-sm font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
                  Account center
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
                  Profile, preferences, billing, security, and support.
                </p>
              </div>

              <nav className="grid" aria-label="Account sections">
                {accountNav.map((item) => {
                  const active = pathname === item.href || section === item.section;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`group flex min-h-[54px] items-center justify-between gap-3 border-b border-[var(--border-subtle)] px-4 py-3 text-left transition last:border-b-0 ${
                        active
                          ? "bg-[var(--bg-hover-strong)] text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold">{item.label}</span>
                        <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                          {item.helper}
                        </span>
                      </span>
                      <span
                        className={`flex h-6 w-6 items-center justify-center rounded-md border border-[var(--border)] transition ${
                          active
                            ? "bg-[var(--accent-2)] text-[var(--accent-2-contrast)]"
                            : "bg-[var(--bg-primary)] text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                        }`}
                      >
                        <ArrowIcon />
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </AccountCard>
          </aside>

          <section className="min-w-0">{<PageContent section={section} />}</section>
        </div>
      </div>
    </main>
  );
}
