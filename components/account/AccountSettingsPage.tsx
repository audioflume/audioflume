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

function ArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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

function Header({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-8 max-w-3xl">
      <div className="text-xs font-medium text-[var(--text-muted)]">{eyebrow}</div>
      <h1 className="mt-2 text-[34px] font-medium leading-none tracking-[-0.055em] text-[var(--text-primary)] md:text-[44px]">
        {title}
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
        {description}
      </p>
    </div>
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
      className={`overflow-hidden rounded-[18px] border border-[var(--border)] bg-transparent ${className}`}
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
        className="h-10 w-full rounded-xl border border-[var(--border)] bg-transparent px-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)]"
      />
    </label>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-transparent px-3.5 py-3">
      <div className="text-xs font-medium text-[var(--text-muted)]">{label}</div>
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
      className={`h-8 cursor-pointer rounded-lg border border-[var(--border)] px-3.5 text-xs font-medium transition ${
        subtle
          ? "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          : "bg-[var(--bg-hover)] text-[var(--text-primary)] hover:bg-[var(--bg-hover-strong)]"
      }`}
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
      className={`flex h-8 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[var(--border)] px-3 text-xs font-medium transition ${
        active
          ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
          : "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
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
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-4 border-b border-[var(--border)] px-4 py-4 last:border-b-0 md:grid-cols-[1fr_auto] md:items-center">
      <div>
        <div className="text-sm font-medium tracking-[-0.02em] text-[var(--text-primary)]">
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
    <>
      <Header
        eyebrow="Account"
        title="Profile"
        description="Manage the personal information connected to your Filmwave library, billing, and support activity."
      />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardTitle
            title="Personal information"
            description="Basic details shown across your account and future customer portal."
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Input label="First name" value={user?.firstName || ""} placeholder="First name" />
            <Input label="Last name" value={user?.lastName || ""} placeholder="Last name" />
            <Input label="Display name" value={fullName} />
            <Input label="Email address" value={email} />
            <Input label="Company / studio" placeholder="Add company name" />
            <Input label="Primary use" placeholder="Documentary, commercial, YouTube..." />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-[var(--border)] px-4 py-3.5">
            <Button>Save changes</Button>
            <Button subtle>Cancel</Button>
          </div>
        </Card>

        <Card>
          <div className="border-b border-[var(--border)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--border)] bg-transparent text-sm font-medium text-[var(--text-primary)]">
                {initials || "FW"}
              </div>
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
    </>
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
    <>
      <Header
        eyebrow="Preferences"
        title="Settings"
        description="Global site preferences stored in Supabase and synced through your existing user preferences context."
      />
      <Card>
        <CardTitle
          title="Global preferences"
          description={preferencesLoaded ? "Preferences loaded from your account." : "Loading saved preferences..."}
        />
        <Row title="Theme" description="Controls the light or dark appearance across Filmwave.">
          <Option<ThemeMode> label="Dark" active={theme === "dark"} onClick={() => setTheme("dark")} />
          <Option<ThemeMode> label="Light" active={theme === "light"} onClick={() => setTheme("light")} />
        </Row>
        <Row title="Playlist view" description="Sets the default layout for your personal playlist library.">
          <Option<PlaylistViewMode> label="Grid" active={playlistViewMode === "grid"} onClick={() => setPlaylistViewMode("grid")} />
          <Option<PlaylistViewMode> label="List" active={playlistViewMode === "list"} onClick={() => setPlaylistViewMode("list")} />
        </Row>
        <Row title="Playlist sorting" description="Choose whether playlists use your custom drag order or stay alphabetical.">
          <Option<PlaylistSortMode> label="Custom" active={playlistSortMode === "custom"} onClick={() => setPlaylistSortMode("custom")} />
          <Option<PlaylistSortMode> label="Alphabetical" active={playlistSortMode === "alphabetical"} onClick={() => setPlaylistSortMode("alphabetical")} />
        </Row>
        <Row title="Sidebar project sorting" description="Controls how projects are ordered inside the main app sidebar.">
          <Option<SidebarProjectSortMode> label="Custom" active={sidebarProjectSortMode === "custom"} onClick={() => setSidebarProjectSortMode("custom")} />
          <Option<SidebarProjectSortMode> label="Alphabetical" active={sidebarProjectSortMode === "alphabetical"} onClick={() => setSidebarProjectSortMode("alphabetical")} />
        </Row>
      </Card>
    </>
  );
}

function Membership() {
  return (
    <>
      <Header
        eyebrow="Membership"
        title="Plan & license"
        description="Review your current Filmwave access, usage snapshot, and future plan options."
      />
      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <div className="border-b border-[var(--border)] p-4">
            <div className="text-xs font-medium text-[var(--text-muted)]">Current plan</div>
            <div className="mt-2 text-2xl font-medium tracking-[-0.05em] text-[var(--text-primary)]">
              Lifetime Membership
            </div>
            <p className="mt-2 max-w-xl text-sm leading-6 text-[var(--text-secondary)]">
              Unlimited access to the Filmwave library, curated playlists, waveform previews, playlist tools, and commercial project licensing.
            </p>
          </div>
          <div className="grid gap-3 p-4 sm:grid-cols-3">
            <Info label="Renewal" value="No renewal" />
            <Info label="Downloads" value="Unlimited" />
            <Info label="License" value="Commercial use" />
          </div>
        </Card>

        <Card>
          <CardTitle title="Usage snapshot" description="Useful account signals for a more complete customer portal." />
          <div className="grid gap-3 p-4">
            <Info label="Songs downloaded" value="128 this year" />
            <Info label="Projects created" value="14 active projects" />
            <Info label="Favorite tracks" value="36 saved" />
          </div>
        </Card>
      </div>
    </>
  );
}

function Payment() {
  return (
    <>
      <Header
        eyebrow="Billing"
        title="Payment"
        description="Manage billing details, payment methods, and receipts for your Filmwave account."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardTitle title="Payment method" description="Primary billing method used for renewals and plan changes." />
          <div className="p-4">
            <div className="rounded-xl border border-[var(--border)] bg-transparent p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[var(--text-primary)]">Visa ending in 4242</div>
                  <div className="mt-1 text-xs text-[var(--text-muted)]">Expires 08/29 · Billing address in Canada</div>
                </div>
                <div className="rounded-md border border-[var(--border)] px-2 py-1 text-[11px] font-medium text-[var(--text-muted)]">
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
          <CardTitle title="Billing details" description="Invoice contact and tax details for receipts." />
          <div className="grid gap-4 p-4">
            <Input label="Billing email" value="billing@example.com" />
            <Input label="Business name" placeholder="Company or studio" />
            <Input label="Tax ID" placeholder="Optional" />
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardTitle title="Recent invoices" description="Download receipts and track billing history." />
        <div className="divide-y divide-[var(--border)]">
          {["May 2026", "April 2026", "March 2026"].map((invoice) => (
            <div key={invoice} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
              <div>
                <div className="text-sm font-medium text-[var(--text-primary)]">{invoice} invoice</div>
                <div className="mt-1 text-xs text-[var(--text-muted)]">Paid · $15.00 CAD</div>
              </div>
              <Button subtle>Download</Button>
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
    <>
      <Header
        eyebrow="Access"
        title="Security"
        description="Manage sign-in details, recovery options, and account protection."
      />
      <div className="grid gap-4 lg:grid-cols-[1fr_0.9fr]">
        <Card>
          <CardTitle title="Sign-in security" description="Keep your account protected with stronger login controls." />
          <Row title="Password" description="Change the password used to access your Filmwave account.">
            <Button>Change password</Button>
          </Row>
          <Row title="Two-factor authentication" description="Add an extra layer of protection for your account.">
            <Button subtle>Set up 2FA</Button>
          </Row>
          <Row title="Backup email" description="Use a secondary email for recovery and account alerts.">
            <Button subtle>Add backup email</Button>
          </Row>
        </Card>

        <Card>
          <CardTitle title="Account access" description="Current verified contact and session information." />
          <div className="grid gap-3 p-4">
            <Info label="Primary email" value={email} />
            <Info label="Email status" value="Verified" />
            <Info label="Active sessions" value="2 devices" />
          </div>
        </Card>
      </div>
    </>
  );
}

function Support() {
  const cards = [
    ["Submit a ticket", "Send a detailed issue report for billing, song files, downloads, licensing, or account problems.", "Start ticket"],
    ["Contact support", "Reach the Filmwave team directly for account questions or help using the library.", "Email support"],
    ["License help", "Find answers about commercial usage, client projects, social ads, and broadcast-style work.", "View license guide"],
  ];
  const faqs = [
    ["Can I use Filmwave songs in client work?", "Yes. Filmwave is structured for royalty-free commercial project use."],
    ["Can I download stems?", "Tracks that include stems can expose them directly from the song card or player menu when configured."],
    ["How do I report a broken file?", "Submit a support ticket with the song title and issue type."],
  ];

  return (
    <>
      <Header
        eyebrow="Help"
        title="Support & FAQ"
        description="Find support options, licensing help, and common account answers."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {cards.map(([title, desc, action]) => (
          <Card key={title} className="p-4">
            <div className="text-sm font-medium text-[var(--text-primary)]">{title}</div>
            <p className="mt-2 min-h-[66px] text-xs leading-5 text-[var(--text-muted)]">{desc}</p>
            <div className="mt-4">
              <Button subtle>{action}</Button>
            </div>
          </Card>
        ))}
      </div>
      <Card className="mt-4">
        <CardTitle title="Frequently asked questions" />
        <div className="divide-y divide-[var(--border)]">
          {faqs.map(([q, a]) => (
            <div key={q} className="px-4 py-3.5">
              <div className="text-sm font-medium text-[var(--text-primary)]">{q}</div>
              <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">{a}</p>
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
  const activeNav = navItems.find((item) => item.section === section);

  return (
    <main className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] md:pl-[var(--sidebar-width,240px)]">
      <div className="grid min-h-screen lg:grid-cols-[260px_1fr]">
        <aside className="border-r border-[var(--border)] px-4 pb-24 pt-[88px] lg:sticky lg:top-0 lg:h-screen">
          <div className="mb-6">
            <div className="text-xs font-medium text-[var(--text-muted)]">Account</div>
            <div className="mt-1 text-lg font-medium tracking-[-0.04em] text-[var(--text-primary)]">Filmwave</div>
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
                    <span className="block text-xs font-medium">{item.label}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-[var(--text-muted)]">{item.helper}</span>
                  </span>
                  <span className={`text-[var(--text-muted)] transition group-hover:text-[var(--text-primary)] ${active ? "opacity-100" : "opacity-0"}`}>
                    <ArrowIcon />
                  </span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <section className="min-w-0 px-5 pb-24 pt-[88px] md:px-8 xl:px-10">
          <div className="mx-auto max-w-[1180px]">
            <div className="mb-8 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div className="text-xs text-[var(--text-muted)]">
                Account / <span className="text-[var(--text-secondary)]">{activeNav?.label || "Account"}</span>
              </div>
              <Link
                href="/music"
                className="inline-flex h-8 items-center justify-center rounded-lg border border-[var(--border)] bg-transparent px-3.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              >
                Back to music
              </Link>
            </div>
            <Content section={section} />
          </div>
        </section>
      </div>
    </main>
  );
}
