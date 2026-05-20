"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

const navItems: {
  href: string;
  section: AccountSection;
  label: string;
  helper: string;
}[] = [
  {
    href: "/account/profile",
    section: "profile",
    label: "Profile",
    helper: "Personal info",
  },
  {
    href: "/account/settings",
    section: "settings",
    label: "Settings",
    helper: "App preferences",
  },
  {
    href: "/account/membership",
    section: "membership",
    label: "Membership",
    helper: "Plan and license",
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
    helper: "Access controls",
  },
  {
    href: "/account/support",
    section: "support",
    label: "Support & FAQ",
    helper: "Help center",
  },
];

const heroConfig: Record<AccountSection, HeroConfig> = {
  profile: {
    eyebrow: "Account",
    title: "Your Filmwave profile.",
    description:
      "Keep your account details, studio info, and creative use case aligned with the music library you build around.",
    image:
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=80",
    statA: "Creator profile",
    statB: "Library access",
    statC: "Personal details",
  },
  settings: {
    eyebrow: "Preferences",
    title: "Shape how Filmwave behaves.",
    description:
      "Adjust the global settings that control your browsing layout, theme, playlist order, and sidebar project workflow.",
    image:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
    statA: "Synced prefs",
    statB: "Playlist layout",
    statC: "Project order",
  },
  membership: {
    eyebrow: "Membership",
    title: "Plan, license, and usage.",
    description:
      "A clearer account home for membership status, usage signals, plan changes, and subscription controls.",
    image:
      "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=80",
    statA: "Commercial use",
    statB: "Unlimited access",
    statC: "Plan controls",
  },
  payment: {
    eyebrow: "Billing",
    title: "Payment details without the clutter.",
    description:
      "Manage cards, invoice details, receipts, and billing contact information from a compact billing workspace.",
    image:
      "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80",
    statA: "Invoices",
    statB: "Payment method",
    statC: "Billing contact",
  },
  security: {
    eyebrow: "Access",
    title: "Keep the account protected.",
    description:
      "Review sign-in controls, recovery details, and account access settings for your Filmwave workspace.",
    image:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
    statA: "Verified email",
    statB: "2 devices",
    statC: "Recovery ready",
  },
  support: {
    eyebrow: "Help",
    title: "Support for the cut.",
    description:
      "Find help for account questions, licensing, billing, missing files, and support requests in one place.",
    image:
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80",
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

function ArrowIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 6L15 12L9 18"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DiagonalArrowIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 17L17 7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M9 7H17V15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
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

function PencilIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 20H8.5L19 9.5L14.5 5L4 15.5V20Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.5 6L18 10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 4V15"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7 10L12 15L17 10"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 20H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TicketIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 8.5V6.5C4 5.4 4.9 4.5 6 4.5H18C19.1 4.5 20 5.4 20 6.5V8.5C18.6 8.5 17.5 9.6 17.5 11C17.5 12.4 18.6 13.5 20 13.5V17.5C20 18.6 19.1 19.5 18 19.5H6C4.9 19.5 4 18.6 4 17.5V13.5C5.4 13.5 6.5 12.4 6.5 11C6.5 9.6 5.4 8.5 4 8.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M10 8H14"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M10 14H14"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4.5 7.5C4.5 6.4 5.4 5.5 6.5 5.5H17.5C18.6 5.5 19.5 6.4 19.5 7.5V16.5C19.5 17.6 18.6 18.5 17.5 18.5H6.5C5.4 18.5 4.5 17.6 4.5 16.5V7.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M5.5 7L12 12.25L18.5 7"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LicenseIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 4.5H14L18 8.5V19.5H7V4.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M14 4.5V8.5H18"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M9.5 13H15.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M9.5 16H13.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ThemeIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 18.5C15.6 18.5 18.5 15.6 18.5 12C18.5 8.4 15.6 5.5 12 5.5V18.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M12 18.5C8.4 18.5 5.5 15.6 5.5 12C5.5 8.4 8.4 5.5 12 5.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlaylistViewIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 5.5H10V10.5H5V5.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M14 5.5H19V10.5H14V5.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M5 14H10V19H5V14Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M14 14H19V19H14V14Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PlaylistSortIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 6H17"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M7 12H14"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M7 18H11"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M18 13V19"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M15.5 16.5L18 19L20.5 16.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SidebarSortIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 5.5H9V18.5H5V5.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
      <path
        d="M13 7H19"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M13 12H17"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M13 17H15"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
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
        <img
          src={config.image}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/46 to-black/10" />
        <div className="relative z-10 flex min-h-[255px] flex-col justify-between p-5 md:p-6">
          <KickerPill>Filmwave account</KickerPill>
          <div className="grid gap-2 sm:grid-cols-3">
            {[config.statA, config.statB, config.statC].map((stat) => (
              <div
                key={stat}
                className="rounded-full border border-white/15 bg-white/10 px-3 py-2 text-[11px] font-medium text-white/80 backdrop-blur"
              >
                {stat}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Card({
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

function CardTitle({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="border-b border-[var(--border)] px-4 py-3.5">
      <h2 className="text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">
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

function Input({
  label,
  value,
  placeholder,
}: {
  label: string;
  value?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">
        {label}
      </span>
      <input
        value={value || ""}
        placeholder={placeholder}
        readOnly
        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 py-3">
      <div className="text-xs font-medium text-[var(--text-muted)]">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-medium text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}

function Button({
  children,
  subtle = false,
}: {
  children: React.ReactNode;
  subtle?: boolean;
}) {
  return (
    <button
      type="button"
      className={`inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--border)] px-3.5 text-xs font-medium transition ${
        subtle
          ? "bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
          : "bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-80"
      }`}
    >
      {children}
    </button>
  );
}

function DangerButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 cursor-pointer items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 text-xs font-medium text-[var(--danger)] transition hover:border-[#fff0f0] hover:bg-[#fff0f0] hover:text-[var(--danger)]"
    >
      {children}
    </button>
  );
}

function Option<T extends string>({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: (value: T) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(label.toLowerCase() as T)}
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

function Row({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 border-b border-[var(--border)] px-4 py-4 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center">
      <div className="flex gap-3">
        {icon ? (
          <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)]">
            {icon}
          </div>
        ) : null}
        <div>
          <div className="text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">
            {title}
          </div>
          <p className="mt-1 max-w-xl text-xs leading-5 text-[var(--text-muted)]">
            {description}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 md:justify-end">{children}</div>
    </div>
  );
}

function ProfileImageUploader({ initials }: { initials: string }) {
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    setProfileImage(localStorage.getItem("filmwave-profile-image"));
  }, []);

  function handleImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const image = typeof reader.result === "string" ? reader.result : null;
      if (!image) return;
      localStorage.setItem("filmwave-profile-image", image);
      setProfileImage(image);
      window.dispatchEvent(new Event("filmwave-profile-image-change"));
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    localStorage.removeItem("filmwave-profile-image");
    setProfileImage(null);
    window.dispatchEvent(new Event("filmwave-profile-image-change"));
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <label className="group relative flex h-16 w-16 cursor-pointer items-center justify-center overflow-visible rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover)]">
        <span className="absolute inset-0 overflow-hidden rounded-xl">
          {profileImage ? (
            <img
              src={profileImage}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : null}
        </span>
        {!profileImage ? <span>{initials || "FW"}</span> : null}
        <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-primary)] text-[var(--text-secondary)] shadow-sm transition group-hover:text-[var(--text-primary)]">
          <PencilIcon />
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageChange}
        />
      </label>
      {profileImage ? (
        <button
          type="button"
          onClick={removeImage}
          className="text-[11px] font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
        >
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
      <img
        src={src}
        alt=""
        className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/56 via-black/12 to-transparent" />
    </div>
  );
}

function Profile() {
  const { user } = useUser();
  const fullName = user?.fullName || "Filmwave Member";
  const email = user?.primaryEmailAddress?.emailAddress || "No email on file";
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
          description="Basic details shown across your account and future customer portal."
        />
        <div className="grid gap-4 p-4 sm:grid-cols-2">
          <Input
            label="First name"
            value={user?.firstName || ""}
            placeholder="First name"
          />
          <Input
            label="Last name"
            value={user?.lastName || ""}
            placeholder="Last name"
          />
          <Input label="Display name" value={fullName} />
          <Input label="Email address" value={email} />
          <Input label="Company / studio" placeholder="Add company name" />
          <Input
            label="Primary use"
            placeholder="Documentary, commercial, YouTube..."
          />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3.5">
          <Button>Save changes</Button>
          <Button subtle>Cancel</Button>
        </div>
      </Card>
      <Card>
        <div className="border-b border-[var(--border)] p-4">
          <div className="flex items-center gap-5">
            <ProfileImageUploader initials={initials} />
            <div className="min-w-0">
              <div className="truncate text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
                {fullName}
              </div>
              <div className="mt-1 truncate text-xs text-[var(--text-muted)]">
                {email}
              </div>
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-4">
          <Info label="Account type" value="Lifetime Member" />
          <Info label="Library license" value="Royalty-free commercial use" />
          <Info label="Member since" value="Mock data" />
        </div>
      </Card>
    </div>
  );
}

function Settings() {
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
    <Card>
      <CardTitle
        title="Global preferences"
        description={
          preferencesLoaded
            ? "Preferences loaded from your account."
            : "Loading saved preferences..."
        }
      />
      <Row
        icon={<ThemeIcon />}
        title="Theme"
        description="Controls the light or dark appearance across Filmwave."
      >
        <Option<ThemeMode>
          label="Dark"
          active={theme === "dark"}
          onClick={() => setTheme("dark")}
        />
        <Option<ThemeMode>
          label="Light"
          active={theme === "light"}
          onClick={() => setTheme("light")}
        />
      </Row>
      <Row
        icon={<PlaylistViewIcon />}
        title="Playlist view"
        description="Sets the default layout for your personal playlist library."
      >
        <Option<PlaylistViewMode>
          label="Grid"
          active={playlistViewMode === "grid"}
          onClick={() => setPlaylistViewMode("grid")}
        />
        <Option<PlaylistViewMode>
          label="List"
          active={playlistViewMode === "list"}
          onClick={() => setPlaylistViewMode("list")}
        />
      </Row>
      <Row
        icon={<PlaylistSortIcon />}
        title="Playlist sorting"
        description="Choose whether playlists use your custom drag order or stay alphabetical."
      >
        <Option<PlaylistSortMode>
          label="Custom"
          active={playlistSortMode === "custom"}
          onClick={() => setPlaylistSortMode("custom")}
        />
        <Option<PlaylistSortMode>
          label="Alphabetical"
          active={playlistSortMode === "alphabetical"}
          onClick={() => setPlaylistSortMode("alphabetical")}
        />
      </Row>
      <Row
        icon={<SidebarSortIcon />}
        title="Sidebar project sorting"
        description="Controls how projects are ordered inside the main app sidebar."
      >
        <Option<SidebarProjectSortMode>
          label="Custom"
          active={sidebarProjectSortMode === "custom"}
          onClick={() => setSidebarProjectSortMode("custom")}
        />
        <Option<SidebarProjectSortMode>
          label="Alphabetical"
          active={sidebarProjectSortMode === "alphabetical"}
          onClick={() => setSidebarProjectSortMode("alphabetical")}
        />
      </Row>
    </Card>
  );
}

function Membership() {
  const plans = [
    [
      "Starter",
      "$15 CAD / mo",
      "Solo creators building a smaller library of client projects.",
    ],
    [
      "Studio",
      "$39 CAD / mo",
      "For active filmmakers and small teams who need more project coverage.",
    ],
    [
      "Enterprise",
      "Custom",
      "For agencies, publishers, and teams with higher-volume licensing needs.",
    ],
  ];

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="border-b border-[var(--border)] p-4">
            <div className="text-xs font-medium text-[var(--text-muted)]">
              Current plan
            </div>
            <div className="mt-2 text-2xl font-medium tracking-[-0.05em] text-[var(--text-primary)]">
              Lifetime Membership
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Unlimited access to the Filmwave library, curated playlists,
              waveform previews, playlist tools, and commercial project
              licensing.
            </p>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-3">
            <Info label="Renewal" value="No renewal" />
            <Info label="Downloads" value="Unlimited" />
            <Info label="License" value="Commercial use" />
          </div>
        </Card>

        <Card>
          <CardTitle
            title="Usage snapshot"
            description="Useful account signals for a more complete customer portal."
          />
          <div className="grid gap-3 p-4">
            <Info label="Songs downloaded" value="128 this year" />
            <Info label="Projects created" value="14 active projects" />
            <Info label="Favorite tracks" value="36 saved" />
          </div>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {plans.map(([name, price, description], index) => (
          <Card key={name} className="group">
            <VisualPanel image={membershipPlanImages[index]} />

            <div className="p-4">
              <div className="flex min-h-[190px] flex-col">
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {name}
                </div>

                <div className="mt-2 text-2xl font-medium tracking-[-0.05em] text-[var(--text-primary)]">
                  {price}
                </div>

                <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                  {description}
                </p>

                <div className="mt-auto pt-5">
                  <Button subtle>
                    {name === "Enterprise" ? "Contact sales" : "Change plan"}{" "}
                    <DiagonalArrowIcon />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-4">
        <div className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <div className="text-sm font-medium text-[var(--text-primary)]">
              Cancel membership
            </div>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-[var(--text-muted)]">
              End future billing and keep access through the current billing
              period. This is a mock control for now.
            </p>
          </div>

          <DangerButton>Cancel membership</DangerButton>
        </div>
      </Card>
    </>
  );
}

function Payment() {
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardTitle
            title="Payment method"
            description="Primary billing method used for renewals and plan changes."
          />
          <div className="p-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    Visa ending in 4242
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    Expires 08/29 · Billing address in Canada
                  </div>
                </div>
                <div className="rounded-full border border-[var(--border)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-muted)]">
                  Mock card
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button>Update payment method</Button>
              <Button subtle>Add backup card</Button>
            </div>
          </div>
        </Card>
        <Card>
          <CardTitle
            title="Billing details"
            description="Invoice contact and tax details for receipts."
          />
          <div className="grid gap-4 p-4">
            <Input label="Billing email" value="billing@example.com" />
            <Input label="Business name" placeholder="Company or studio" />
            <Input label="Tax ID" placeholder="Optional" />
          </div>
        </Card>
      </div>
      <Card className="mt-4">
        <CardTitle
          title="Recent invoices"
          description="Download receipts and track billing history."
        />
        <div className="divide-y divide-[var(--border)]">
          {["May 2026", "April 2026", "March 2026"].map((invoice) => (
            <div
              key={invoice}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5"
            >
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {invoice} invoice
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">
                  Paid · $15.00 CAD
                </div>
              </div>
              <Button subtle>
                Download <DownloadIcon />
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

function Security() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress || "Primary email";
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
      <Card>
        <CardTitle
          title="Sign-in security"
          description="Keep your account protected with stronger login controls."
        />
        <Row
          title="Password"
          description="Change the password used to access your Filmwave account."
        >
          <Button>Change password</Button>
        </Row>
        <Row
          title="Two-factor authentication"
          description="Add an extra layer of protection for your account."
        >
          <Button subtle>Set up 2FA</Button>
        </Row>
        <Row
          title="Backup email"
          description="Use a secondary email for recovery and account alerts."
        >
          <Button subtle>Add backup email</Button>
        </Row>
      </Card>
      <Card>
        <CardTitle
          title="Account access"
          description="Current verified contact and session information."
        />
        <div className="grid gap-3 p-4">
          <Info label="Primary email" value={email} />
          <Info label="Email status" value="Verified" />
          <Info label="Active sessions" value="2 devices" />
        </div>
      </Card>
    </div>
  );
}

function Support() {
  const cards = [
    {
      title: "Submit a ticket",
      description:
        "Send a detailed issue report for billing, song files, downloads, licensing, or account problems.",
      action: "Start ticket",
      icon: <TicketIcon />,
    },
    {
      title: "Contact support",
      description:
        "Reach the Filmwave team directly for account questions or help using the library.",
      action: "Email support",
      icon: <MailIcon />,
    },
    {
      title: "License help",
      description:
        "Find answers about commercial usage, client projects, social ads, and broadcast-style work.",
      action: "View license guide",
      icon: <LicenseIcon />,
    },
  ];
  const faqs = [
    [
      "Can I use Filmwave songs in client work?",
      "Yes. Filmwave is structured for royalty-free commercial project use.",
    ],
    [
      "Can I download stems?",
      "Tracks that include stems can expose them directly from the song card or player menu when configured.",
    ],
    [
      "How do I report a broken file?",
      "Submit a support ticket with the song title and issue type.",
    ],
  ];
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map((card, index) => (
          <Card key={card.title} className="group">
            <VisualPanel index={index} />
            <div className="p-4">
              <div className="text-sm font-medium text-[var(--text-primary)]">
                {card.title}
              </div>
              <p className="mt-2 min-h-[66px] text-xs leading-5 text-[var(--text-muted)]">
                {card.description}
              </p>
              <div className="mt-4">
                <Button subtle>
                  {card.action} {card.icon}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <CardTitle title="Frequently asked questions" />
        <div className="divide-y divide-[var(--border)]">
          {faqs.map(([question, answer]) => (
            <div key={question} className="px-4 py-3.5">
              <div className="text-sm font-medium text-[var(--text-primary)]">
                {question}
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
                {answer}
              </p>
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

export default function AccountSettingsPage({
  section,
}: AccountSettingsPageProps) {
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
            <div className="text-xs font-medium text-[var(--text-muted)]">
              Account
            </div>
            <div className="mt-1 text-lg font-medium tracking-[-0.04em] text-[var(--text-primary)]">
              Filmwave
            </div>
          </div>
          <nav className="grid gap-0.5" aria-label="Account sections">
            {navItems.map((item) => {
              const active = pathname === item.href || section === item.section;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex min-h-[48px] items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                    active
                      ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-xs font-medium">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">
                      {item.helper}
                    </span>
                  </span>
                  <span
                    className={`text-[var(--text-muted)] transition group-hover:text-[var(--text-primary)] ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    <ArrowIcon />
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 px-5 pt-[88px] md:px-8 xl:px-10">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-8 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div className="text-xs text-[var(--text-muted)]">
                Account /{" "}
                <span className="text-[var(--text-secondary)]">
                  {activeNav?.label || "Account"}
                </span>
              </div>
              <Link
                href="/music"
                className="inline-flex h-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-secondary)] px-3.5 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Back to music
              </Link>
            </div>

            <AccountHero config={currentHero} />

            <Content section={section} />

            <div
              className="mt-16 border-t border-[var(--border)] pt-8"
              style={{ paddingBottom: hasPlayer ? "72px" : "8px" }}
            >
              <Footer />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
