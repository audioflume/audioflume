"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser } from "@clerk/nextjs";
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

function MockInput({
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
      <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
        {label}
      </span>
      <input
        value={value || ""}
        placeholder={placeholder}
        readOnly
        className="h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm font-medium text-[var(--text-primary)] outline-none transition placeholder:font-normal placeholder:text-[var(--text-muted)] focus:border-[var(--accent-2)]"
      />
    </label>
  );
}

function PrimaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="h-8 cursor-pointer rounded-lg bg-[var(--accent)] px-3.5 text-xs font-semibold text-[var(--accent-contrast)] transition hover:opacity-90"
    >
      {children}
    </button>
  );
}

function SecondaryButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="h-8 cursor-pointer rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3.5 text-xs font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-hover-strong)]"
    >
      {children}
    </button>
  );
}

function OptionButton<T extends string>({
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

function ProfileSection() {
  const { user } = useUser();

  const fullName = user?.fullName || "Filmwave Member";
  const firstName = user?.firstName || "";
  const lastName = user?.lastName || "";
  const email = user?.primaryEmailAddress?.emailAddress || "No email on file";
  const initials = fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <SectionHeader
        eyebrow="Account"
        title="Profile"
        description="Manage the personal information attached to your Filmwave account. This is structured as a functional mockup for future account editing."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <AccountCard>
          <CardHeader
            title="Personal information"
            description="Core account details used for billing, support, and saved library activity."
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <MockInput label="First name" value={firstName} placeholder="First name" />
            <MockInput label="Last name" value={lastName} placeholder="Last name" />
            <MockInput label="Display name" value={fullName} />
            <MockInput label="Email address" value={email} />
            <MockInput label="Company / studio" placeholder="Add company name" />
            <MockInput label="Primary use" placeholder="Documentary, commercial, YouTube..." />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3.5">
            <PrimaryButton>Save profile</PrimaryButton>
            <SecondaryButton>Cancel changes</SecondaryButton>
          </div>
        </AccountCard>

        <AccountCard>
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] text-sm font-semibold text-[var(--text-primary)]">
                {initials || "FW"}
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
            <FieldDisplay label="Account type" value="Lifetime Member" />
            <FieldDisplay label="Library license" value="Royalty-free commercial use" />
            <FieldDisplay label="Member since" value="Mock data" />
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
          <OptionButton<ThemeMode> label="Dark" active={theme === "dark"} onClick={() => setTheme("dark")} />
          <OptionButton<ThemeMode> label="Light" active={theme === "light"} onClick={() => setTheme("light")} />
        </SettingRow>

        <SettingRow
          title="Playlist view"
          description="Sets the default visual layout for your personal playlist library."
        >
          <OptionButton<PlaylistViewMode> label="Grid" active={playlistViewMode === "grid"} onClick={() => setPlaylistViewMode("grid")} />
          <OptionButton<PlaylistViewMode> label="List" active={playlistViewMode === "list"} onClick={() => setPlaylistViewMode("list")} />
        </SettingRow>

        <SettingRow
          title="Playlist sorting"
          description="Choose whether playlists hold your custom drag order or stay alphabetical."
        >
          <OptionButton<PlaylistSortMode> label="Custom" active={playlistSortMode === "custom"} onClick={() => setPlaylistSortMode("custom")} />
          <OptionButton<PlaylistSortMode> label="Alphabetical" active={playlistSortMode === "alphabetical"} onClick={() => setPlaylistSortMode("alphabetical")} />
        </SettingRow>

        <SettingRow
          title="Sidebar project sorting"
          description="Controls how user projects are ordered inside the main app sidebar."
        >
          <OptionButton<SidebarProjectSortMode> label="Custom" active={sidebarProjectSortMode === "custom"} onClick={() => setSidebarProjectSortMode("custom")} />
          <OptionButton<SidebarProjectSortMode> label="Alphabetical" active={sidebarProjectSortMode === "alphabetical"} onClick={() => setSidebarProjectSortMode("alphabetical")} />
        </SettingRow>
      </AccountCard>
    </>
  );
}

function MembershipSection() {
  return (
    <>
      <SectionHeader
        eyebrow="Subscription"
        title="Membership"
        description="A clear overview of plan status, licensing, usage, and future upgrade paths for Filmwave members."
      />

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <AccountCard>
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                  Current plan
                </div>
                <div className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                  Lifetime Membership
                </div>
                <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
                  Unlimited access to the Filmwave music library, curated playlists,
                  waveform previews, playlist tools, and commercial project licensing.
                </p>
              </div>
              <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 py-1.5 text-xs font-semibold text-[var(--accent)]">
                Active
              </div>
            </div>
          </div>

          <div className="grid gap-3 p-4 sm:grid-cols-3">
            <FieldDisplay label="Renewal" value="No renewal" />
            <FieldDisplay label="Downloads" value="Unlimited" />
            <FieldDisplay label="License" value="Commercial use" />
          </div>
        </AccountCard>

        <AccountCard>
          <CardHeader title="Usage snapshot" description="Useful account signals for a more complete customer portal." />
          <div className="grid gap-3 p-4">
            <FieldDisplay label="Songs downloaded" value="128 this year" />
            <FieldDisplay label="Projects created" value="14 active projects" />
            <FieldDisplay label="Favorite tracks" value="36 saved" />
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
              <SecondaryButton>{name === "Enterprise" ? "Contact sales" : "Change plan"}</SecondaryButton>
            </div>
          </AccountCard>
        ))}
      </div>
    </>
  );
}

function PaymentSection() {
  return (
    <>
      <SectionHeader
        eyebrow="Billing"
        title="Payment"
        description="Manage payment methods, invoices, billing contact details, and tax information from a compact billing workspace."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <AccountCard>
          <CardHeader title="Payment method" description="Primary billing method used for subscription renewals and upgrades." />
          <div className="p-4">
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    Visa ending in 4242
                  </div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    Expires 08/29 · Billing address in Canada
                  </div>
                </div>
                <div className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
                  Mock card
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <PrimaryButton>Update payment method</PrimaryButton>
              <SecondaryButton>Add backup card</SecondaryButton>
            </div>
          </div>
        </AccountCard>

        <AccountCard>
          <CardHeader title="Billing details" description="Invoice contact and tax details for receipts." />
          <div className="grid gap-4 p-4">
            <MockInput label="Billing email" value="billing@example.com" />
            <MockInput label="Business name" placeholder="Company or studio" />
            <MockInput label="Tax ID" placeholder="Optional" />
          </div>
        </AccountCard>
      </div>

      <AccountCard className="mt-4">
        <CardHeader title="Recent invoices" description="Download receipts and track billing history." />
        <div className="divide-y divide-[var(--border-subtle)]">
          {["May 2026", "April 2026", "March 2026"].map((invoice) => (
            <div key={invoice} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">
                  {invoice} invoice
                </div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">
                  Paid · $15.00 CAD
                </div>
              </div>
              <SecondaryButton>Download</SecondaryButton>
            </div>
          ))}
        </div>
      </AccountCard>
    </>
  );
}

function SecuritySection() {
  const { user } = useUser();
  const email = user?.primaryEmailAddress?.emailAddress || "Primary email";

  return (
    <>
      <SectionHeader
        eyebrow="Access"
        title="Security"
        description="Password, email recovery, sessions, and account protection for Filmwave sign-in access."
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <AccountCard>
          <CardHeader title="Sign-in security" description="Keep your account protected with stronger login controls." />
          <div className="divide-y divide-[var(--border-subtle)]">
            <SettingRow title="Password" description="Change the password used to access your Filmwave account.">
              <PrimaryButton>Change password</PrimaryButton>
            </SettingRow>
            <SettingRow title="Two-factor authentication" description="Add an extra layer of protection for your account.">
              <SecondaryButton>Set up 2FA</SecondaryButton>
            </SettingRow>
            <SettingRow title="Backup email" description="Use a secondary email for recovery and important account alerts.">
              <SecondaryButton>Add backup email</SecondaryButton>
            </SettingRow>
          </div>
        </AccountCard>

        <AccountCard>
          <CardHeader title="Account access" description="Current verified contact and session information." />
          <div className="grid gap-3 p-4">
            <FieldDisplay label="Primary email" value={email} />
            <FieldDisplay label="Email status" value="Verified" />
            <FieldDisplay label="Active sessions" value="2 devices" />
          </div>
        </AccountCard>
      </div>

      <AccountCard className="mt-4">
        <CardHeader title="Recent security events" description="A lightweight audit trail for user confidence." />
        <div className="divide-y divide-[var(--border-subtle)]">
          {["Password login", "New session started", "Profile viewed"].map((event) => (
            <div key={event} className="grid gap-1 px-4 py-3.5 sm:grid-cols-[1fr_auto]">
              <div className="text-sm font-medium text-[var(--text-primary)]">{event}</div>
              <div className="text-xs text-[var(--text-muted)]">Mock event · Vancouver, BC</div>
            </div>
          ))}
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
              <StatusPill label="Status" value="Mockup" />
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
