"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import ArtistMusicUploader from "@/components/artists/ArtistMusicUploader";
import ArtistProfileEditor from "@/components/artists/ArtistProfileEditor";
import Footer from "@/components/Footer";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";

type ArtistDashboardSection =
  | "overview"
  | "profile"
  | "music"
  | "releases"
  | "playlists"
  | "analytics"
  | "team";

type ArtistDashboardShellProps = {
  profiles: ArtistDashboardProfile[];
};

const ARTIST_DASHBOARD_SECTION_STORAGE_KEY =
  "audioflume:artist-dashboard-section";

const NAV_ITEMS: { section: ArtistDashboardSection; label: string }[] = [
  { section: "overview", label: "Overview" },
  { section: "profile", label: "Profile" },
  { section: "music", label: "Music" },
  { section: "releases", label: "Releases" },
  { section: "playlists", label: "Playlists" },
  { section: "analytics", label: "Analytics" },
  { section: "team", label: "Team" },
];

function isArtistDashboardSection(
  value: string | null,
): value is ArtistDashboardSection {
  return NAV_ITEMS.some((item) => item.section === value);
}

function formatStatus(status: ArtistDashboardProfile["status"]) {
  if (status === "approved") return "Approved";
  if (status === "rejected") return "Changes needed";
  if (status === "suspended") return "Suspended";
  return "Pending review";
}

function formatRole(role: ArtistDashboardProfile["role"]) {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

function StatusBadge({ status }: { status: ArtistDashboardProfile["status"] }) {
  const styles =
    status === "approved"
      ? "bg-[var(--status-success-soft)] text-[var(--status-success)]"
      : status === "pending"
        ? "bg-[var(--status-warning-soft)] text-[var(--status-warning)]"
        : status === "rejected"
          ? "bg-[var(--status-error-soft)] text-[var(--status-error)]"
          : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]";

  return (
    <span
      className={`inline-flex h-7 items-center rounded-full px-3 text-[10px] font-medium uppercase tracking-[0.05em] ${styles}`}
    >
      {formatStatus(status)}
    </span>
  );
}

function Overview({ artist }: { artist: ArtistDashboardProfile }) {
  const stats = [
    { label: "Tracks", value: artist.stats.tracks },
    { label: "Releases", value: artist.stats.releases },
    { label: "Playlists", value: artist.stats.playlists },
  ];

  return (
    <div className="grid gap-5">
      <section className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] p-5"
          >
            <div className="text-[11px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
              {stat.label}
            </div>
            <div className="mt-5 text-[34px] font-medium leading-none tracking-[-0.05em] text-[var(--text-primary)]">
              {stat.value}
            </div>
          </div>
        ))}
      </section>

      <section className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <h2 className="text-lg font-medium tracking-[-0.03em] text-[var(--text-primary)]">
            Artist workspace
          </h2>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Your profile, catalogue, releases, playlists, analytics, and team will all be managed from here.
          </p>
        </div>

        <div className="grid divide-y divide-[var(--border)]">
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">Profile</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                Artist information, imagery, links, and public profile details.
              </div>
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)]">
              Ready
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">Music</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                Upload, organize, submit, and manage your Audioflume catalogue.
              </div>
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)]">
              Ready
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div>
              <div className="text-sm font-medium text-[var(--text-primary)]">Releases + playlists</div>
              <div className="mt-1 text-xs text-[var(--text-muted)]">
                Build releases and organize artist-curated collections.
              </div>
            </div>
            <span className="shrink-0 text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)]">
              Upcoming
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function PlaceholderSection({ section }: { section: ArtistDashboardSection }) {
  const label = NAV_ITEMS.find((item) => item.section === section)?.label ?? "Artist";

  return (
    <div className="flex min-h-[280px] items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-6 text-center">
      <div>
        <div className="text-lg font-medium tracking-[-0.03em] text-[var(--text-primary)]">
          {label}
        </div>
        <p className="mt-2 max-w-[420px] text-xs leading-5 text-[var(--text-muted)]">
          This section is part of the artist workspace shell and will be built as we move through the artist setup checklist.
        </p>
      </div>
    </div>
  );
}

export default function ArtistDashboardShell({ profiles }: ArtistDashboardShellProps) {
  const [dashboardProfiles, setDashboardProfiles] = useState(profiles);
  const [activeArtistId, setActiveArtistId] = useState(profiles[0]?.id ?? "");
  const [activeSection, setActiveSection] =
    useState<ArtistDashboardSection>("overview");
  const [sectionReady, setSectionReady] = useState(false);
  const [musicViewVersion, setMusicViewVersion] = useState(0);

  useEffect(() => {
    const storedSection = window.localStorage.getItem(
      ARTIST_DASHBOARD_SECTION_STORAGE_KEY,
    );

    if (isArtistDashboardSection(storedSection)) {
      setActiveSection(storedSection);
    }

    setSectionReady(true);
  }, []);

  const activeArtist = useMemo(
    () =>
      dashboardProfiles.find((profile) => profile.id === activeArtistId) ??
      dashboardProfiles[0],
    [activeArtistId, dashboardProfiles],
  );

  function handleSectionChange(section: ArtistDashboardSection) {
    if (section === "music") {
      setMusicViewVersion((current) => current + 1);
    }

    setActiveSection(section);
    window.localStorage.setItem(ARTIST_DASHBOARD_SECTION_STORAGE_KEY, section);
  }

  function handleProfileSaved(
    updatedArtist: Partial<ArtistDashboardProfile> & { id: string },
  ) {
    setDashboardProfiles((current) =>
      current.map((profile) =>
        profile.id === updatedArtist.id
          ? { ...profile, ...updatedArtist }
          : profile,
      ),
    );
  }

  function handleSongUploaded() {
    if (!activeArtist) return;

    setDashboardProfiles((current) =>
      current.map((profile) =>
        profile.id === activeArtist.id
          ? {
              ...profile,
              stats: {
                ...profile.stats,
                tracks: profile.stats.tracks + 1,
              },
            }
          : profile,
      ),
    );
  }

  if (!activeArtist) {
    return (
      <main className="min-h-screen bg-[var(--bg-primary)] px-5 pt-[112px] text-[var(--text-primary)] md:px-8 xl:px-10">
        <div className="mx-auto max-w-[900px]">
          <div className="rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-6 py-10 text-center">
            <h1 className="text-2xl font-medium tracking-[-0.04em]">No artist profile yet</h1>
            <p className="mx-auto mt-2 max-w-[460px] text-sm leading-6 text-[var(--text-secondary)]">
              Create an artist application first. Once the profile exists, this dashboard becomes its central workspace.
            </p>
            <Link
              href="/artists/apply"
              className="mt-5 inline-flex h-9 items-center justify-center rounded-[7px] bg-[var(--text-primary)] px-4 text-xs font-medium text-[var(--bg-primary)] transition hover:opacity-80"
            >
              Apply as an artist
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className={`min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] ${
        sectionReady ? "" : "invisible"
      }`}
    >
      <div className="grid min-h-screen lg:grid-cols-[250px_1fr]">
        <aside className="border-r border-[var(--border)] bg-[var(--bg-primary)] px-5 pb-8 pt-[112px] lg:sticky lg:top-0 lg:h-screen">
          <div className="mb-7">
            <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
              Artist dashboard
            </div>
            <div className="mt-2 truncate text-lg font-medium tracking-[-0.03em] text-[var(--text-primary)]">
              {activeArtist.name}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <StatusBadge status={activeArtist.status} />
              <span className="text-[10px] uppercase tracking-[0.05em] text-[var(--text-muted)]">
                {formatRole(activeArtist.role)}
              </span>
            </div>
          </div>

          {dashboardProfiles.length > 1 ? (
            <label className="mb-7 block">
              <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.05em] text-[var(--text-muted)]">
                Artist
              </span>
              <select
                value={activeArtist.id}
                onChange={(event) => setActiveArtistId(event.target.value)}
                className="h-10 w-full rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] px-3 text-xs text-[var(--text-primary)] outline-none"
              >
                {dashboardProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <nav className="grid gap-1" aria-label="Artist dashboard sections">
            {NAV_ITEMS.map((item) => {
              const active = sectionReady && activeSection === item.section;
              return (
                <button
                  key={item.section}
                  type="button"
                  onClick={() => handleSectionChange(item.section)}
                  className={`flex h-10 cursor-pointer items-center rounded-[7px] px-3 text-left text-xs transition ${
                    active
                      ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <Link
            href="/music"
            className="mt-8 inline-flex h-9 w-full items-center justify-center rounded-[7px] border border-[var(--border)] bg-[var(--bg-secondary)] text-xs text-[var(--text-secondary)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Back to Audioflume
          </Link>
        </aside>

        <section className="min-w-0 px-5 pb-16 pt-[100px] md:px-8 xl:px-10">
          <div className="mx-auto max-w-[1100px]">
            <div className="mb-7 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
              <div className="text-xs text-[var(--text-muted)]">
                Artists / <span className="text-[var(--text-primary)]">{NAV_ITEMS.find((item) => item.section === activeSection)?.label}</span>
              </div>
              <div className="text-xs text-[var(--text-muted)]">/{activeArtist.slug}</div>
            </div>

            <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--text-muted)]">
                  {formatStatus(activeArtist.status)}
                </div>
                <h1 className="mt-2 text-[clamp(34px,5vw,56px)] font-medium leading-none tracking-[-0.055em] text-[var(--text-primary)]">
                  {activeArtist.name}
                </h1>
              </div>
              <StatusBadge status={activeArtist.status} />
            </div>

            {activeSection === "overview" ? (
              <Overview artist={activeArtist} />
            ) : activeSection === "profile" ? (
              <ArtistProfileEditor
                artist={activeArtist}
                onSaved={handleProfileSaved}
              />
            ) : activeSection === "music" ? (
              <ArtistMusicUploader
                key={musicViewVersion}
                artist={activeArtist}
                onUploaded={handleSongUploaded}
              />
            ) : (
              <PlaceholderSection section={activeSection} />
            )}

            <div className="mt-16 border-t border-[var(--border)] pt-8">
              <Footer className="!px-0" />
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
