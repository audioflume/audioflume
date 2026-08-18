"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import AdminPageHeader from "@/components/admin/AdminPageHeader";
import ArtistMusicUploader from "@/components/artists/ArtistMusicUploader";
import ArtistProfileEditor from "@/components/artists/ArtistProfileEditor";
import ArtistReleaseManager from "@/components/artists/ArtistReleaseManager";
import DashboardIcon from "@/components/icons/DashboardIcon";
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

type ArtistNavGroup = {
  title: string;
  items: { section: ArtistDashboardSection; label: string }[];
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

const NAV_GROUPS: ArtistNavGroup[] = [
  {
    title: "Manage",
    items: [
      { section: "profile", label: "Profile" },
      { section: "music", label: "Music" },
      { section: "releases", label: "Releases" },
      { section: "playlists", label: "Playlists" },
    ],
  },
  {
    title: "Workspace",
    items: [
      { section: "analytics", label: "Analytics" },
      { section: "team", label: "Team" },
    ],
  },
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

function ArtistSectionHeading({ children }: { children: string }) {
  return (
    <div className="mb-[17px] px-3 font-[family-name:var(--font-aktiv-grotesk)] text-[11px] font-medium uppercase leading-none tracking-[0.02em] text-[var(--text-primary)]">
      {children}
    </div>
  );
}

function ArtistNavButton({
  section,
  label,
  active,
  onClick,
}: {
  section: ArtistDashboardSection;
  label: string;
  active: boolean;
  onClick: (section: ArtistDashboardSection) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onClick(section)}
      className={`flex h-[38px] w-full cursor-pointer items-center justify-between gap-3 pl-3 pr-2 text-left text-[12.5px] font-normal transition-colors focus-visible:bg-[var(--bg-hover)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none ${
        active
          ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
      }`}
    >
      <span className="truncate">{label}</span>
    </button>
  );
}

function Overview({ artist }: { artist: ArtistDashboardProfile }) {
  const stats = [
    { label: "Tracks", value: artist.stats.tracks },
    { label: "Releases", value: artist.stats.releases },
    { label: "Playlists", value: artist.stats.playlists },
  ];

  return (
    <div className="grid gap-4">
      {artist.hero_image_url ? (
        <div className="h-[210px] overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-tertiary)]">
          <img
            src={artist.hero_image_url}
            alt={`${artist.name} hero`}
            className="h-full w-full object-cover"
          />
        </div>
      ) : null}

      <section className="grid gap-2 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="filmwave-backend-section flex min-h-[72px] flex-col justify-between p-3"
          >
            <span className="text-xs text-[var(--text-secondary)]">{stat.label}</span>
            <span className="mt-3 font-[family-name:var(--font-aktiv-grotesk)] text-[24px] font-medium leading-none tracking-[-0.04em] text-[var(--text-primary)]">
              {stat.value}
            </span>
          </div>
        ))}
      </section>
    </div>
  );
}

function PlaceholderSection({ section }: { section: ArtistDashboardSection }) {
  const label = NAV_ITEMS.find((item) => item.section === section)?.label ?? "Artist";

  return (
    <div className="filmwave-backend-section flex min-h-[280px] items-center justify-center px-6 text-center">
      <div className="font-[family-name:var(--font-aktiv-grotesk)] text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
        {label}
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

  const activeSectionLabel =
    NAV_ITEMS.find((item) => item.section === activeSection)?.label ?? "Artist";

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

  function handleReleaseCreated() {
    if (!activeArtist) return;

    setDashboardProfiles((current) =>
      current.map((profile) =>
        profile.id === activeArtist.id
          ? {
              ...profile,
              stats: {
                ...profile.stats,
                releases: profile.stats.releases + 1,
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
          <div className="filmwave-backend-section px-6 py-10 text-center">
            <h1 className="font-[family-name:var(--font-aktiv-grotesk)] text-2xl font-medium tracking-[-0.04em]">
              No artist profile yet
            </h1>
            <p className="mx-auto mt-2 max-w-[460px] text-sm leading-6 text-[var(--text-secondary)]">
              Create an artist application first. Once the profile exists, this dashboard becomes its central workspace.
            </p>
            <Link
              href="/artists/apply"
              className="filmwave-backend-button filmwave-backend-button-primary mt-5"
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
      className={`min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)] ${
        sectionReady ? "" : "invisible"
      }`}
    >
      <aside
        className="fixed left-0 z-30 hidden w-[var(--admin-sidebar-width)] border-r border-[var(--border)] bg-[var(--bg-primary)] md:flex md:flex-col"
        style={{ top: "var(--filmwave-header-height)", bottom: "0px" }}
      >
        <div className="flex flex-1 flex-col overflow-y-auto px-7 pb-8 pt-8">
          <div className="border-b border-[var(--border)] pb-8">
            <ArtistSectionHeading>Artist</ArtistSectionHeading>
            <button
              type="button"
              onClick={() => handleSectionChange("overview")}
              className={`group flex h-[38px] w-full cursor-pointer items-center gap-2.5 pl-3 pr-2 text-left text-[12.5px] font-normal transition-colors focus-visible:bg-[var(--bg-hover)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none ${
                sectionReady && activeSection === "overview"
                  ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
              }`}
            >
              <span
                className={`flex h-4 w-4 items-center justify-center transition-colors ${
                  sectionReady && activeSection === "overview"
                    ? "text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)]"
                }`}
              >
                <DashboardIcon size={14} />
              </span>
              <span className="truncate">Overview</span>
            </button>
          </div>

          <div className="mt-8 grid gap-8">
            {NAV_GROUPS.map((group) => (
              <div key={group.title} className="shrink-0">
                <ArtistSectionHeading>{group.title}</ArtistSectionHeading>
                <div className="flex flex-col gap-px">
                  {group.items.map((item) => (
                    <ArtistNavButton
                      key={item.section}
                      section={item.section}
                      label={item.label}
                      active={sectionReady && activeSection === item.section}
                      onClick={handleSectionChange}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-auto pt-8">
            <div className="border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2.5">
              <div className="mb-2 font-mono text-[8px] uppercase tracking-[0.08em] text-[var(--text-muted)]">
                Active artist
              </div>
              <div className="truncate text-xs font-medium text-[var(--text-primary)]">
                {activeArtist.name}
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                <span>{formatStatus(activeArtist.status)}</span>
                <span>{formatRole(activeArtist.role)}</span>
              </div>

              {dashboardProfiles.length > 1 ? (
                <select
                  value={activeArtist.id}
                  onChange={(event) => setActiveArtistId(event.target.value)}
                  className="mt-3 h-8 w-full border border-[var(--border)] bg-[var(--bg-primary)] px-2 text-[11px] text-[var(--text-primary)] outline-none"
                >
                  {dashboardProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            <Link
              href="/music"
              className="mt-2 flex h-[38px] items-center px-3 text-[12.5px] text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
            >
              Back to Audioflume
            </Link>
          </div>
        </div>
      </aside>

      <section className="min-h-screen bg-[var(--filmwave-admin-canvas)] px-5 pb-0 pt-[88px] md:px-8 xl:px-10">
        <div className="mx-auto max-w-[var(--filmwave-backend-content-max-width)]">
          <div className="mb-5 md:hidden">
            {dashboardProfiles.length > 1 ? (
              <select
                value={activeArtist.id}
                onChange={(event) => setActiveArtistId(event.target.value)}
                className="filmwave-backend-select mb-3"
              >
                {dashboardProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            ) : null}

            <nav
              className="flex overflow-x-auto border border-[var(--border)] bg-[var(--bg-primary)]"
              aria-label="Artist dashboard sections"
            >
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.section}
                  type="button"
                  onClick={() => handleSectionChange(item.section)}
                  className={`h-[38px] shrink-0 px-3 text-xs transition-colors ${
                    sectionReady && activeSection === item.section
                      ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          </div>

          <AdminPageHeader section="Artist" label={activeSectionLabel} compact />

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
          ) : activeSection === "releases" ? (
            <ArtistReleaseManager
              artist={activeArtist}
              onReleaseCreated={handleReleaseCreated}
            />
          ) : (
            <PlaceholderSection section={activeSection} />
          )}

          <div className="mt-16">
            <Footer
              playerPadding={false}
              showTopBorder={false}
              pageGutter={false}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
