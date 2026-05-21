"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Footer from "@/components/Footer";
import { useTheme } from "@/context/ThemeContext";
import { usePlayer } from "@/context/PlayerContext";
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

type HeroConfig = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  statA: string;
  statB: string;
  statC: string;
};

type LoadState = "idle" | "loading" | "ready" | "error";

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

const navItems: {
  href: string;
  section: AccountSection;
  label: string;
  helper: string;
}[] = [
  { href: "/account/profile", section: "profile", label: "Profile", helper: "Personal info" },
  { href: "/account/settings", section: "settings", label: "Settings", helper: "App preferences" },
  { href: "/account/membership", section: "membership", label: "Membership", helper: "Plan and license" },
  { href: "/account/payment", section: "payment", label: "Payment", helper: "Billing method" },
  { href: "/account/security", section: "security", label: "Security", helper: "Access controls" },
  { href: "/account/support", section: "support", label: "Support & FAQ", helper: "Help center" },
];

const heroConfig: Record<AccountSection, HeroConfig> = {
  profile: {
    eyebrow: "Account",
    title: "Your Filmwave profile.",
    description: "Keep your account details, studio info, and creative use case aligned with the music library you build around.",
    image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=80",
    statA: "Creator profile",
    statB: "Library access",
    statC: "Personal details",
  },
  settings: {
    eyebrow: "Preferences",
    title: "Shape how Filmwave behaves.",
    description: "Adjust the global settings that control your browsing layout, theme, playlist order, and sidebar project workflow.",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
    statA: "Synced prefs",
    statB: "Playlist layout",
    statC: "Project order",
  },
  membership: {
    eyebrow: "Membership",
    title: "Plan, license, and usage.",
    description: "A clearer account home for membership status, usage signals, plan changes, and subscription controls.",
    image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=80",
    statA: "Commercial use",
    statB: "Unlimited access",
    statC: "Plan controls",
  },
  payment: {
    eyebrow: "Billing",
    title: "Payment details without the clutter.",
    description: "Manage invoice details and billing contact information from a compact billing workspace.",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80",
    statA: "Invoices",
    statB: "Payment method",
    statC: "Billing contact",
  },
  security: {
    eyebrow: "Access",
    title: "Keep the account protected.",
    description: "Review sign-in controls, recovery details, and account access settings for your Filmwave workspace.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
    statA: "Verified email",
    statB: "Clerk security",
    statC: "Recovery ready",
  },
  support: {
    eyebrow: "Help",
    title: "Support for the cut.",
    description: "Find help for account questions, licensing, billing, missing files, and support requests in one place.",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80",
    statA: "Support tickets",
    statB: "License help",
    statC: "FAQ",
  },
};

const supportImages = [
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80",
];

const membershipPlanImages = [
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80",
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
  return new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function formatCount(value: number, label: string) {
  return `${value} ${label}${value === 1 ? "" : "s"}`;
}

function ArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DiagonalArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 17L17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M9 7H17V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 20H8.5L19 9.5L14.5 5L4 15.5V20Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13.5 6L18 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5 20H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 8.5V6.5C4 5.4 4.9 4.5 6 4.5H18C19.1 4.5 20 5.4 20 6.5V8.5C18.6 8.5 17.5 9.6 17.5 11C17.5 12.4 18.6 13.5 20 13.5V17.5C20 18.6 19.1 19.5 18 19.5H6C4.9 19.5 4 18.6 4 17.5V13.5C5.4 13.5 6.5 12.4 6.5 11C6.5 9.6 5.4 8.5 4 8.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 8H14M10 14H14" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4.5 7.5C4.5 6.4 5.4 5.5 6.5 5.5H17.5C18.6 5.5 19.5 6.4 19.5 7.5V16.5C19.5 17.6 18.6 18.5 17.5 18.5H6.5C5.4 18.5 4.5 17.6 4.5 16.5V7.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M5.5 7L12 12.25L18.5 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LicenseIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 4.5H14L18 8.5V19.5H7V4.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M14 4.5V8.5H18" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M9.5 13H15.5M9.5 16H13.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function ThemeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 18.5C15.6 18.5 18.5 15.6 18.5 12C18.5 8.4 15.6 5.5 12 5.5V18.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M12 18.5C8.4 18.5 5.5 15.6 5.5 12C5.5 8.4 8.4 5.5 12 5.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function PlaylistViewIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 5.5H10V10.5H5V5.5ZM14 5.5H19V10.5H14V5.5ZM5 14H10V19H5V14ZM14 14H19V19H14V14Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
    </svg>
  );
}

function PlaylistSortIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M7 6H17M7 12H14M7 18H11M18 13V19" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M15.5 16.5L18 19L20.5 16.5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SidebarSortIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 5.5H9V18.5H5V5.5Z" stroke="currentColor" strokeWidth="1.9" strokeLinejoin="round" />
      <path d="M13 7H19M13 12H17M13 17H15" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  );
}

function KickerPill({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex w-fit max-w-full items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-medium leading-none text-white/75 backdrop-blur">
      <span className="truncate">{children}</span>
    </div>
  );
}

function AccountHero({ config }: { config: HeroConfig }) {
  return (
    <section className="mb-8">
      <div className="mb-6 grid gap-6 xl:grid-cols-[minmax(0,0.9fr)_minmax(360px,0.72fr)] xl:items-end">
        <div>
          <div className="mb-3 inline-flex items-center text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
            {config.eyebrow}
          </div>
          <h1 className="max-w-[760px] font-[family-name:var(--font-instrument-sans)] text-[clamp(42px,6vw,76px)] font-medium leading-[0.9] tracking-[-0.07em] text-[var(--text-primary)]">
            {config.title}
          </h1>
        </div>
        <p className="max-w-[520px] text-sm leading-6 text-[var(--text-secondary)] xl:justify-self-end">
          {config.description}
        </p>
      </div>

      <div className="group relative min-h-[255px] overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)]">
        <img src={config.image} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/46 to-black/10" />
        <div className="relative z-10 flex min-h-[255px] flex-col justify-between p-5 md:p-6">
          <KickerPill>Filmwave account</KickerPill>
          <div className="grid gap-2 sm:grid-cols-3">
            {[config.statA, config.statB, config.statC].map((stat) => (
              <div key={stat} className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-medium text-white/80 backdrop-blur">
                {stat}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`overflow-hidden rounded-[18px] border border-[var(--border)] bg-[var(--bg-secondary)] ${className}`}>{children}</div>;
}

function CardTitle({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-[var(--border)] px-4 py-3.5">
      <h2 className="text-2xl font-medium tracking-[-0.02em] text-[var(--text-primary)]">{title}</h2>
      {description ? <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{description}</p> : null}
    </div>
  );
}

function Input({
  label,
  value,
  placeholder,
  onChange,
  readOnly = false,
  type = "text",
}: {
  label: string;
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">{label}</span>
      <input
        type={type}
        value={value || ""}
        placeholder={placeholder}
        readOnly={readOnly}
        onChange={(event) => onChange?.(event.target.value)}
        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)] read-only:cursor-default"
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3">
      <div className="text-xs font-medium text-[var(--text-muted)]">{label}</div>
      <div className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">{value}</div>
    </div>
  );
}

function Button({
  children,
  subtle = false,
  dark = false,
  disabled = false,
  type = "button",
  onClick,
}: {
  children: React.ReactNode;
  subtle?: boolean;
  dark?: boolean;
  disabled?: boolean;
  type?: "button" | "submit";
  onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-full border px-3.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-45 ${
        dark
          ? "border-[#111111] bg-[#111111] text-white hover:border-[#272727] hover:bg-[#272727]"
          : subtle
            ? "border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
            : "border-[var(--text-primary)] bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-80"
      }`}
    >
      {children}
    </button>
  );
}

function DangerButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 text-xs font-medium text-[var(--danger)] transition hover:border-[#fff0f0] hover:bg-[#fff0f0] hover:text-[var(--danger)]"
    >
      {children}
    </button>
  );
}

function Option<T extends string>({ label, value, active, onClick }: { label: string; value: T; active: boolean; onClick: (value: T) => void }) {
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      className={`flex h-8 cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--border)] px-3 text-xs font-medium transition ${
        active
          ? "bg-[var(--text-primary)] text-[var(--bg-primary)]"
          : "bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
      }`}
    >
      {active ? <CheckIcon /> : null}
      {label}
    </button>
  );
}

function Row({ title, description, icon, children }: { title: string; description: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="grid gap-4 border-b border-[var(--border)] px-4 py-4 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center">
      <div className="flex gap-3">
        {icon ? <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)]">{icon}</div> : null}
        <div>
          <div className="text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">{title}</div>
          <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--text-muted)]">{description}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">{children}</div>
    </div>
  );
}

function Feedback({ message, tone }: { message: string; tone: "success" | "error" }) {
  return (
    <div className={`rounded-xl border px-3 py-2 text-xs ${tone === "success" ? "border-[rgba(72,181,113,0.35)] bg-[rgba(72,181,113,0.08)] text-[#48b571]" : "border-[rgba(220,88,79,0.35)] bg-[rgba(220,88,79,0.08)] text-[#dc584f]"}`}>
      {message}
    </div>
  );
}

function ProfileImageUploader({ initials, value, onChange }: { initials: string; value: string; onChange: (value: string) => void }) {
  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = typeof reader.result === "string" ? reader.result : "";
      onChange(image);
      localStorage.setItem("filmwave-profile-image", image);
      window.dispatchEvent(new Event("filmwave-profile-image-change"));
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    onChange("");
    localStorage.removeItem("filmwave-profile-image");
    window.dispatchEvent(new Event("filmwave-profile-image-change"));
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <label className="group relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-visible rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]">
        <span className="absolute inset-0 overflow-hidden rounded-xl">
          {value ? <img src={value} alt="Profile" className="h-full w-full object-cover" /> : null}
        </span>
        {!value ? <span>{initials || "FW"}</span> : null}
        <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] shadow-sm transition group-hover:text-[var(--text-primary)]">
          <PencilIcon />
        </span>
        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
      </label>
      {value ? (
        <button type="button" onClick={removeImage} className="text-[11px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]">
          Remove photo
        </button>
      ) : null}
    </div>
  );
}

function VisualPanel({ image, index }: { image?: string; index?: number }) {
  const src = image || supportImages[(index || 0) % supportImages.length];
  return (
    <div className="relative h-40 overflow-hidden border-b border-[var(--border)] bg-[var(--bg-hover)]">
      <img src={src} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/56 via-black/12 to-transparent" />
    </div>
  );
}

function Profile() {
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
        if (!response.ok) throw new Error(payload?.error || "Failed to load profile");
        if (!active) return;
        setProfile(payload.profile);
        setIdentityEmail(payload.identity?.email ?? null);
        setForm(profileToForm(payload.profile));
        setLoadState("ready");
      } catch (error) {
        console.error(error);
        if (!active) return;
        setLoadState("error");
        setMessage({ tone: "error", text: "Could not load profile. Make sure the Supabase SQL has been run." });
      }
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  const fullName = form.display_name || user?.fullName || "Filmwave Member";
  const email = identityEmail || user?.primaryEmailAddress?.emailAddress || "No email on file";
  const initials = fullName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
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
      if (!response.ok) throw new Error(payload?.error || "Failed to save profile");
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
    <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardTitle title="Personal information" description={loadState === "loading" ? "Loading your saved profile..." : "Basic details shown across your account and future customer portal."} />
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
              <Button subtle disabled={saving || !profileChanged} onClick={() => setForm(profileToForm(profile))}>Cancel</Button>
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

function Settings() {
  const { theme, setTheme } = useTheme();
  const { playlistViewMode, setPlaylistViewMode, playlistSortMode, setPlaylistSortMode, sidebarProjectSortMode, setSidebarProjectSortMode, preferencesLoaded } = useUserPreferences();

  return (
    <Card>
      <CardTitle title="Global preferences" description={preferencesLoaded ? "Preferences loaded from your account." : "Loading saved preferences..."} />
      <Row icon={<ThemeIcon />} title="Theme" description="Controls the light or dark appearance across Filmwave.">
        <Option<ThemeMode> label="Dark" value="dark" active={theme === "dark"} onClick={() => setTheme("dark")} />
        <Option<ThemeMode> label="Light" value="light" active={theme === "light"} onClick={() => setTheme("light")} />
      </Row>
      <Row icon={<PlaylistViewIcon />} title="Playlist view" description="Sets the default layout for your personal playlist library.">
        <Option<PlaylistViewMode> label="Grid" value="grid" active={playlistViewMode === "grid"} onClick={() => setPlaylistViewMode("grid")} />
        <Option<PlaylistViewMode> label="List" value="list" active={playlistViewMode === "list"} onClick={() => setPlaylistViewMode("list")} />
      </Row>
      <Row icon={<PlaylistSortIcon />} title="Playlist sorting" description="Choose whether playlists use your custom drag order or stay alphabetical.">
        <Option<PlaylistSortMode> label="Custom" value="custom" active={playlistSortMode === "custom"} onClick={() => setPlaylistSortMode("custom")} />
        <Option<PlaylistSortMode> label="Alphabetical" value="alphabetical" active={playlistSortMode === "alphabetical"} onClick={() => setPlaylistSortMode("alphabetical")} />
      </Row>
      <Row icon={<SidebarSortIcon />} title="Sidebar project sorting" description="Controls how projects are ordered inside the main app sidebar.">
        <Option<SidebarProjectSortMode> label="Custom" value="custom" active={sidebarProjectSortMode === "custom"} onClick={() => setSidebarProjectSortMode("custom")} />
        <Option<SidebarProjectSortMode> label="Alphabetical" value="alphabetical" active={sidebarProjectSortMode === "alphabetical"} onClick={() => setSidebarProjectSortMode("alphabetical")} />
      </Row>
    </Card>
  );
}

function Membership() {
  const [membership, setMembership] = useState<UserMembership | null>(null);
  const [display, setDisplay] = useState<MembershipDisplay | null>(null);
  const [usage, setUsage] = useState<UsageSnapshot | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("idle");

  useEffect(() => {
    let active = true;
    async function loadMembership() {
      setLoadState("loading");
      try {
        const [membershipResponse, usageResponse] = await Promise.all([fetch("/api/account/membership"), fetch("/api/account/usage")]);
        const membershipPayload = await membershipResponse.json();
        const usagePayload = await usageResponse.json();
        if (!membershipResponse.ok) throw new Error(membershipPayload?.error || "Failed to load membership");
        if (!usageResponse.ok) throw new Error(usagePayload?.error || "Failed to load usage");
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

  const plans = [
    ["Starter", "$15 CAD / mo", "Solo creators building a smaller library of client projects."],
    ["Studio", "$39 CAD / mo", "For active filmmakers and small teams who need more project coverage."],
    ["Enterprise", "Custom", "For agencies, publishers, and teams with higher-volume licensing needs."],
  ];

  return (
    <>
      {loadState === "error" ? <div className="mb-4"><Feedback tone="error" message="Could not load membership details. Make sure the Supabase SQL has been run." /></div> : null}
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="border-b border-[var(--border)] p-4">
            <div className="text-xs font-medium text-[var(--text-muted)]">Current plan</div>
            <div className="mt-2 text-2xl font-medium tracking-[-0.02em] text-[var(--text-primary)]">{display?.plan_label || "Loading membership..."}</div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{membership?.license_label || "Your Filmwave membership controls library access, playlist tools, and commercial licensing."}</p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            <Info label="Renewal" value={display?.renewal_label || "Loading"} />
            <Info label="Downloads" value={display?.downloads_label || "Loading"} />
            <Info label="License" value={membership?.license_label || "Loading"} />
          </div>
        </Card>
        <Card>
          <CardTitle title="Usage snapshot" description="Live account signals from your Filmwave workspace." />
          <div className="grid gap-3 p-4">
            <Info label="Songs downloaded" value={formatCount(usage?.downloads ?? 0, "download")} />
            <Info label="Projects created" value={formatCount(usage?.projects ?? 0, "project")} />
            <Info label="Favorite tracks" value={formatCount(usage?.favorites ?? 0, "saved track")} />
            <Info label="Playlists" value={formatCount(usage?.playlists ?? 0, "playlist")} />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {plans.map(([name, price, description], index) => (
          <Card key={name} className="group">
            <VisualPanel image={membershipPlanImages[index]} />
            <div className="p-4">
              <div className="flex min-h-[190px] flex-col">
                <div className="text-sm font-medium text-[var(--text-primary)]">{name}</div>
                <div className="mt-2 text-2xl font-medium tracking-[-0.05em] text-[var(--text-primary)]">{price}</div>
                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{description}</p>
                <div className="mt-auto pt-5"><Button dark>{name === "Enterprise" ? "Contact sales" : "Coming soon"} <DiagonalArrowIcon /></Button></div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">Cancel membership</div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text-muted)]">Membership cancellation will be handled through Stripe once subscriptions are connected.</p>
          </div>
          <DangerButton>Stripe coming soon</DangerButton>
        </div>
      </Card>
    </>
  );
}

function Payment() {
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
        if (!response.ok) throw new Error(payload?.error || "Failed to load billing profile");
        if (!active) return;
        setBillingProfile(payload.billingProfile);
        setForm(billingToForm(payload.billingProfile));
        setLoadState("ready");
      } catch (error) {
        console.error(error);
        if (!active) return;
        setLoadState("error");
        setMessage({ tone: "error", text: "Could not load billing details. Make sure the Supabase SQL has been run." });
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
      if (!response.ok) throw new Error(payload?.error || "Failed to save billing details");
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
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardTitle title="Payment method" description="Card data should be handled through Stripe, not stored in Supabase." />
          <div className="p-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">Stripe customer portal not connected yet</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">Customer ID: {billingProfile?.stripe_customer_id || "Not created"}</div>
                </div>
                <div className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">Stripe-ready</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2"><Button subtle>Connect Stripe later</Button></div>
          </div>
        </Card>
        <Card>
          <CardTitle title="Billing details" description={loadState === "loading" ? "Loading billing details..." : "Invoice contact and tax details for receipts."} />
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
                <Button subtle disabled={saving || !billingChanged} onClick={() => setForm(billingToForm(billingProfile))}>Cancel</Button>
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

function Security() {
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
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardTitle title="Sign-in security" description="Secure identity controls are handled by Clerk." />
          <Row title="Password" description="Change the password used to access your Filmwave account through Clerk."><Button subtle>Managed by Clerk</Button></Row>
          <Row title="Two-factor authentication" description="Add an extra layer of protection from your Clerk user profile."><Button subtle>Managed by Clerk</Button></Row>
          <Row title="Backup email" description="Use Clerk to manage recovery and verified email addresses."><Button subtle>Managed by Clerk</Button></Row>
        </Card>
        <Card>
          <CardTitle title="Account access" description="Current verified contact and identity status from Clerk." />
          <div className="grid gap-3 p-4">
            <Info label="Primary email" value={email} />
            <Info label="Email status" value={user?.primaryEmailAddress?.verification?.status || "Unknown"} />
            <Info label="User ID" value={user?.id || "Unavailable"} />
          </div>
        </Card>
      </div>
      <Card className="mt-4">
        <CardTitle title="Recent security events" description="Lightweight Filmwave-side audit trail. Clerk remains the source of truth for auth sessions." />
        <div className="divide-y divide-[var(--border)]">
          {events.length > 0 ? events.map((event) => (
            <div key={event.id} className="grid gap-1 px-4 py-3.5 sm:grid-cols-[1fr_auto]">
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{event.event_type}</div>
                {event.description ? <div className="mt-1 text-xs text-[var(--text-muted)]">{event.description}</div> : null}
              </div>
              <div className="text-xs text-[var(--text-muted)]">{event.location_label || "Filmwave"} · {formatDate(event.created_at)}</div>
            </div>
          )) : <div className="px-4 py-6 text-sm text-[var(--text-muted)]">No Filmwave security events yet.</div>}
        </div>
      </Card>
    </>
  );
}

function Support() {
  const cards = [
    { title: "Submit a ticket", description: "Send a detailed issue report for billing, song files, downloads, licensing, or account problems.", action: "Start ticket", icon: <TicketIcon /> },
    { title: "Contact support", description: "Reach the Filmwave team directly for account questions or help using the library.", action: "Email support", icon: <MailIcon /> },
    { title: "License help", description: "Find answers about commercial usage, client projects, social ads, and broadcast-style work.", action: "View license guide", icon: <LicenseIcon /> },
  ];
  const faqs = [
    ["Can I use Filmwave songs in client work?", "Yes. Filmwave is structured for royalty-free commercial project use."],
    ["Can I download stems?", "Tracks that include stems can expose them directly from the song card or player menu when configured."],
    ["How do I report a broken file?", "Submit a support ticket with the song title and issue type."],
  ];
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((card, index) => (
          <Card key={card.title} className="group">
            <VisualPanel index={index} />
            <div className="p-4">
              <div className="text-sm font-medium text-[var(--text-primary)]">{card.title}</div>
              <p className="mt-2 min-h-[66px] text-xs leading-5 text-[var(--text-muted)]">{card.description}</p>
              <div className="mt-4"><Button dark>{card.action} {card.icon}</Button></div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <CardTitle title="Frequently asked questions" />
        <div className="divide-y divide-[var(--border)]">
          {faqs.map(([question, answer]) => (
            <div key={question} className="px-4 py-3.5">
              <div className="text-sm font-medium text-[var(--text-primary)]">{question}</div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{answer}</p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function Content({ section }: { section: AccountSection }) {
  if (section === "profile") return <Profile />;
  if (section === "settings") return <Settings />;
  if (section === "membership") return <Membership />;
  if (section === "payment") return <Payment />;
  if (section === "security") return <Security />;
  return <Support />;
}

export default function AccountSettingsPage({ section }: AccountSettingsPageProps) {
  const pathname = usePathname();
  const { currentSong } = usePlayer();
  const activeNav = navItems.find((item) => item.section === section);
  const currentHero = heroConfig[section];
  const hasPlayer = Boolean(currentSong);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-[padding-left] duration-200 ease-out md:pl-[var(--sidebar-width,240px)]">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-[var(--border)] bg-[var(--bg-primary)] px-4 pb-24 pt-[88px] lg:sticky lg:top-0 lg:h-screen">
          <div className="mb-6">
            <div className="text-xs font-medium text-[var(--text-muted)]">Account</div>
            <div className="mt-1 text-lg font-medium tracking-[-0.04em] text-[var(--text-primary)]">Filmwave</div>
          </div>
          <nav className="grid gap-0.5" aria-label="Account sections">
            {navItems.map((item) => {
              const active = pathname === item.href || section === item.section;
              return (
                <Link key={item.href} href={item.href} className={`group flex min-h-[48px] items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition ${active ? "bg-[var(--bg-hover)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"}`}>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">{item.label}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">{item.helper}</span>
                  </span>
                  <span className={`text-[var(--text-muted)] transition group-hover:text-[var(--text-primary)] ${active ? "opacity-100" : "opacity-0"}`}><ArrowIcon /></span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 px-5 pt-[88px] md:px-8 xl:px-10">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-8 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div className="text-xs text-[var(--text-muted)]">Account / <span className="text-[var(--text-secondary)]">{activeNav?.label || "Account"}</span></div>
              <Link href="/music" className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]">Back to music</Link>
            </div>
            <AccountHero config={currentHero} />
            <Content section={section} />
            <div className="mt-16 border-t border-[var(--border)] pt-8" style={{ paddingBottom: hasPlayer ? "72px" : "8px" }}>
              <Footer />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
