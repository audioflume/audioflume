"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { BackendSelect } from "@/components/backend/BackendControls";
import BackendPageHeader from "@/components/backend/BackendPageHeader";
import {
  BackendSidebarGroup,
  BackendSidebarHeading,
  BackendSidebarNavItem,
  BackendSidebarScrollArea,
  BackendSidebarShell,
} from "@/components/backend/BackendSidebar";
import ArtistAgreements from "@/components/artists/ArtistAgreements";
import ArtistAnalytics from "@/components/artists/ArtistAnalytics";
import ArtistEarnings from "@/components/artists/ArtistEarnings";
import ArtistMusicUploader from "@/components/artists/ArtistMusicUploader";
import ArtistNotifications from "@/components/artists/ArtistNotifications";
import ArtistPagePreview from "@/components/artists/ArtistPagePreview";
import ArtistPlaylistManager from "@/components/artists/ArtistPlaylistManager";
import ArtistProfileEditor from "@/components/artists/ArtistProfileEditor";
import ArtistReleaseManager from "@/components/artists/ArtistReleaseManager";
import ArtistTeamManager from "@/components/artists/ArtistTeamManager";
import Footer from "@/components/Footer";
import { usePlayer } from "@/context/PlayerContext";
import type { ArtistDashboardProfile } from "@/lib/artistDashboard";

type ArtistDashboardSection =
  | "overview"
  | "my-page"
  | "profile"
  | "music"
  | "releases"
  | "playlists"
  | "notifications"
  | "agreements"
  | "analytics"
  | "earnings"
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
  { section: "my-page", label: "My Page" },
  { section: "profile", label: "Profile" },
  { section: "music", label: "Music" },
  { section: "releases", label: "Releases" },
  { section: "playlists", label: "Playlists" },
  { section: "notifications", label: "Notifications" },
  { section: "agreements", label: "Agreements" },
  { section: "analytics", label: "Analytics" },
  { section: "earnings", label: "Earnings" },
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
      { section: "notifications", label: "Notifications" },
      { section: "agreements", label: "Agreements" },
      { section: "analytics", label: "Analytics" },
      { section: "earnings", label: "Earnings" },
      { section: "team", label: "Team" },
    ],
  },
];

function isArtistDashboardSection(
  value: string | null,
): value is ArtistDashboardSection {
  return NAV_ITEMS.some((item) => item.section === value);
}

function canViewEarnings(role: ArtistDashboardProfile["role"]) {
  return role === "owner" || role === "manager";
}

function getArtistDashboardHref(
  section: ArtistDashboardSection,
  artistId: string,
) {
  const params = new URLSearchParams({ section });
  if (artistId) params.set("artist", artistId);
  return `/artists/dashboard?${params.toString()}`;
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

function Overview({ artist }: { artist: ArtistDashboardProfile }) {
  const stats = [
    { label: "Approved Tracks", value: artist.stats.tracks },
    { label: "Releases", value: artist.stats.releases },
    { label: "Playlists", value: artist.stats.playlists },
  ];

  return (
    <div className="grid gap-4">
      {artist.hero_image_url ? (
        <div className="h-[250px] overflow-hidden rounded-[10px] border border-[var(--border)] bg-[var(--bg-tertiary)]">
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentSong } = usePlayer();
  const playerVisible = Boolean(currentSong);
  const requestedSection = searchParams.get("section");
  const requestedArtistId = searchParams.get("artist");
  const artistSwitcherRef = useRef<HTMLDivElement>(null);
  const [dashboardProfiles, setDashboardProfiles] = useState(profiles);
  const [activeArtistId, setActiveArtistId] = useState(profiles[0]?.id ?? "");
  const [artistSwitcherOpen, setArtistSwitcherOpen] = useState(false);
  const [activeSection, setActiveSection] =
    useState<ArtistDashboardSection>("overview");
  const [sectionReady, setSectionReady] = useState(false);
  const [sectionViewVersion, setSectionViewVersion] = useState(0);
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);

  useEffect(() => {
    if (
      requestedArtistId &&
      profiles.some((profile) => profile.id === requestedArtistId)
    ) {
      setActiveArtistId(requestedArtistId);
    }

    const storedSection = window.localStorage.getItem(
      ARTIST_DASHBOARD_SECTION_STORAGE_KEY,
    );
    const nextSection = isArtistDashboardSection(requestedSection)
      ? requestedSection
      : isArtistDashboardSection(storedSection)
        ? storedSection
        : "overview";

    setActiveSection(nextSection);
    window.localStorage.setItem(
      ARTIST_DASHBOARD_SECTION_STORAGE_KEY,
      nextSection,
    );
    setSectionReady(true);
  }, [profiles, requestedArtistId, requestedSection]);

  useEffect(() => {
    if (!artistSwitcherOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        artistSwitcherRef.current &&
        event.target instanceof Node &&
        !artistSwitcherRef.current.contains(event.target)
      ) {
        setArtistSwitcherOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setArtistSwitcherOpen(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [artistSwitcherOpen]);

  const activeArtist = useMemo(
    () =>
      dashboardProfiles.find((profile) => profile.id === activeArtistId) ??
      dashboardProfiles[0],
    [activeArtistId, dashboardProfiles],
  );

  useEffect(() => {
    if (!sectionReady || !activeArtist?.id) {
      setNotificationUnreadCount(0);
      return;
    }

    let cancelled = false;

    async function loadNotificationCount() {
      try {
        const response = await fetch(
          `/api/artists/${activeArtist.id}/notifications`,
          { cache: "no-store" },
        );
        const payload = (await response.json().catch(() => null)) as
          | { unread_count?: number }
          | null;

        if (!response.ok || cancelled) return;

        setNotificationUnreadCount(
          typeof payload?.unread_count === "number" ? payload.unread_count : 0,
        );
      } catch {
        if (!cancelled) setNotificationUnreadCount(0);
      }
    }

    void loadNotificationCount();

    return () => {
      cancelled = true;
    };
  }, [activeArtist?.id, activeSection, sectionReady]);

  const activeSectionLabel =
    NAV_ITEMS.find((item) => item.section === activeSection)?.label ?? "Artist";

  function handleSectionChange(section: ArtistDashboardSection) {
    setSectionViewVersion((current) => current + 1);
    setActiveSection(section);
    window.localStorage.setItem(ARTIST_DASHBOARD_SECTION_STORAGE_KEY, section);
  }

  function handleArtistChange(artistId: string) {
    setArtistSwitcherOpen(false);
    setActiveArtistId(artistId);
    router.replace(getArtistDashboardHref(activeSection, artistId), {
      scroll: false,
    });
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
    // New uploads are not approved yet, so the approved-track stat does not change here.
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

  function handlePlaylistCreated() {
    if (!activeArtist) return;

    setDashboardProfiles((current) =>
      current.map((profile) =>
        profile.id === activeArtist.id
          ? {
              ...profile,
              stats: {
                ...profile.stats,
                playlists: profile.stats.playlists + 1,
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

  const isMyPage = activeSection === "my-page";
  const earningsVisible = canViewEarnings(activeArtist.role);
  const canSwitchArtists = dashboardProfiles.length > 1;

  return (
    <main
      className={`min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)] ${
        isMyPage ? "pt-[var(--filmwave-header-height)]" : "pt-14"
      } ${sectionReady ? "" : "invisible"}`}
    >
      <BackendSidebarShell bottom={playerVisible ? "64px" : "0px"}>
        <BackendSidebarScrollArea>
          <div ref={artistSwitcherRef} className="relative">
            <button
              type="button"
              onClick={(event) => {
                const target = event.target;
                if (
                  notificationUnreadCount > 0 &&
                  target instanceof Element &&
                  target.closest("[data-artist-notification-badge]")
                ) {
                  setArtistSwitcherOpen(false);
                  handleSectionChange("notifications");
                  router.replace(
                    getArtistDashboardHref("notifications", activeArtist.id),
                    { scroll: false },
                  );
                  return;
                }

                if (canSwitchArtists) {
                  setArtistSwitcherOpen((open) => !open);
                }
              }}
              aria-haspopup={canSwitchArtists ? "menu" : undefined}
              aria-expanded={canSwitchArtists ? artistSwitcherOpen : undefined}
              className={`relative w-full rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)] p-3 text-left transition-colors ${
                canSwitchArtists ? "cursor-pointer" : "cursor-default"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-[var(--bg-tertiary)] text-[14px] font-medium text-[var(--text-secondary)]">
                  {activeArtist.profile_image_url ? (
                    <img
                      src={activeArtist.profile_image_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{activeArtist.name.slice(0, 1).toUpperCase()}</span>
                  )}
                </div>
                <div className={`min-w-0 flex-1 ${canSwitchArtists ? "pr-5" : ""}`}>
                  <div className="truncate text-xs font-medium text-[var(--text-primary)]">
                    {activeArtist.name}
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-[var(--text-muted)]">
                    <span>{formatStatus(activeArtist.status)}</span>
                    <span>{formatRole(activeArtist.role)}</span>
                  </div>
                </div>
              </div>

              {canSwitchArtists ? (
                <svg
                  viewBox="0 0 12 12"
                  fill="none"
                  aria-hidden="true"
                  className={`absolute right-3 top-3.5 h-3 w-3 text-[var(--text-primary)] transition-transform ${
                    artistSwitcherOpen ? "rotate-180" : ""
                  }`}
                >
                  <path
                    d="M2.25 4.25L6 8L9.75 4.25"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : null}

              {notificationUnreadCount > 0 ? (
                <span
                  data-artist-notification-badge
                  className="absolute -right-2 -top-2 z-10 flex h-5 min-w-5 cursor-pointer items-center justify-center rounded-full bg-[var(--danger)] px-1.5 text-[10px] font-medium leading-none text-[var(--danger-contrast)] ring-2 ring-[var(--bg-primary)]"
                  aria-label={`${notificationUnreadCount} unread ${
                    notificationUnreadCount === 1 ? "notification" : "notifications"
                  }`}
                >
                  {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
                </span>
              ) : null}
            </button>

            {canSwitchArtists && artistSwitcherOpen ? (
              <div
                role="menu"
                className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 flex max-h-64 flex-col gap-px overflow-y-auto rounded-[10px] border border-[var(--border)] bg-[var(--bg-primary)] p-1.5 shadow-[0_12px_30px_rgba(0,0,0,0.14)]"
              >
                {dashboardProfiles.map((profile) => {
                  const selected = profile.id === activeArtist.id;

                  return (
                    <button
                      key={profile.id}
                      type="button"
                      role="menuitem"
                      onClick={() => handleArtistChange(profile.id)}
                      className={`flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left transition-colors ${
                        selected
                          ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
                      }`}
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-[5px] bg-[var(--bg-tertiary)] text-[11px] font-medium text-[var(--text-secondary)]">
                        {profile.profile_image_url ? (
                          <img
                            src={profile.profile_image_url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span>{profile.name.slice(0, 1).toUpperCase()}</span>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-medium text-[var(--text-primary)]">
                          {profile.name}
                        </div>
                        <div className="mt-0.5 truncate text-[9px] text-[var(--text-muted)]">
                          {formatStatus(profile.status)}
                        </div>
                      </div>
                      {selected ? (
                        <svg
                          viewBox="0 0 12 12"
                          fill="none"
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0 text-[var(--text-primary)]"
                        >
                          <path
                            d="M2 6.25L4.55 8.75L10 3.25"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="mt-8">
            <BackendSidebarHeading>Artist</BackendSidebarHeading>
            <div className="flex flex-col gap-px">
              <BackendSidebarNavItem
                href={getArtistDashboardHref("overview", activeArtist.id)}
                active={sectionReady && activeSection === "overview"}
                onClick={() => handleSectionChange("overview")}
              >
                Overview
              </BackendSidebarNavItem>
              <BackendSidebarNavItem
                href={getArtistDashboardHref("my-page", activeArtist.id)}
                active={sectionReady && activeSection === "my-page"}
                onClick={() => handleSectionChange("my-page")}
              >
                My Page
              </BackendSidebarNavItem>
            </div>
          </div>

          <div className="mt-8 grid gap-8">
            {NAV_GROUPS.map((group) => (
              <BackendSidebarGroup key={group.title} title={group.title}>
                {group.items
                  .filter(
                    (item) => item.section !== "earnings" || earningsVisible,
                  )
                  .map((item) => (
                    <BackendSidebarNavItem
                      key={item.section}
                      href={getArtistDashboardHref(item.section, activeArtist.id)}
                      active={sectionReady && activeSection === item.section}
                      onClick={() => handleSectionChange(item.section)}
                    >
                      {item.label}
                    </BackendSidebarNavItem>
                  ))}
              </BackendSidebarGroup>
            ))}
          </div>
        </BackendSidebarScrollArea>
      </BackendSidebarShell>

      <section
        className={
          isMyPage
            ? "min-h-screen bg-[var(--bg-primary)] p-0"
            : "min-h-screen bg-[var(--filmwave-admin-canvas)] px-5 pb-0 pt-[88px] md:px-8 xl:px-10"
        }
      >
        <div
          className={
            isMyPage
              ? "w-full"
              : "mx-auto max-w-[var(--filmwave-backend-content-max-width)]"
          }
        >
          <div className={`mb-5 md:hidden ${isMyPage ? "px-5 pt-5" : ""}`}>
            {dashboardProfiles.length > 1 ? (
              <BackendSelect
                value={activeArtist.id}
                onChange={(event) => handleArtistChange(event.target.value)}
                className="mb-3"
              >
                {dashboardProfiles.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </BackendSelect>
            ) : null}

            <nav
              className="flex overflow-x-auto border border-[var(--border)] bg-[var(--bg-primary)]"
              aria-label="Artist dashboard sections"
            >
              {NAV_ITEMS.filter(
                (item) => item.section !== "earnings" || earningsVisible,
              ).map((item) => (
                <Link
                  key={item.section}
                  href={getArtistDashboardHref(item.section, activeArtist.id)}
                  onClick={() => handleSectionChange(item.section)}
                  className={`flex h-[38px] shrink-0 items-center px-3 text-xs transition-colors ${
                    sectionReady && activeSection === item.section
                      ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                      : "text-[var(--text-secondary)]"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {!isMyPage ? (
            <BackendPageHeader section="Artist" label={activeSectionLabel} compact />
          ) : null}

          {activeSection === "overview" ? (
            <Overview
              key={`${activeArtist.id}-overview-${sectionViewVersion}`}
              artist={activeArtist}
            />
          ) : activeSection === "my-page" ? (
            <ArtistPagePreview
              key={`${activeArtist.id}-my-page-${sectionViewVersion}`}
              artist={activeArtist}
              onSaved={handleProfileSaved}
            />
          ) : activeSection === "profile" ? (
            <ArtistProfileEditor
              key={`${activeArtist.id}-profile-${sectionViewVersion}`}
              artist={activeArtist}
              onSaved={handleProfileSaved}
            />
          ) : activeSection === "music" ? (
            <ArtistMusicUploader
              key={`${activeArtist.id}-music-${sectionViewVersion}`}
              artist={activeArtist}
              onUploaded={handleSongUploaded}
              onNotificationCreated={() =>
                setNotificationUnreadCount((current) => current + 1)
              }
            />
          ) : activeSection === "releases" ? (
            <ArtistReleaseManager
              key={`${activeArtist.id}-releases-${sectionViewVersion}`}
              artist={activeArtist}
              onReleaseCreated={handleReleaseCreated}
            />
          ) : activeSection === "playlists" ? (
            <ArtistPlaylistManager
              key={`${activeArtist.id}-playlists-${sectionViewVersion}`}
              artist={activeArtist}
              onPlaylistCreated={handlePlaylistCreated}
            />
          ) : activeSection === "notifications" ? (
            <ArtistNotifications
              key={`${activeArtist.id}-notifications-${sectionViewVersion}`}
              artistId={activeArtist.id}
              onUnreadCountChange={setNotificationUnreadCount}
            />
          ) : activeSection === "agreements" ? (
            <ArtistAgreements
              key={`${activeArtist.id}-agreements-${sectionViewVersion}`}
              artistId={activeArtist.id}
            />
          ) : activeSection === "analytics" ? (
            <ArtistAnalytics
              key={`${activeArtist.id}-analytics-${sectionViewVersion}`}
              artistId={activeArtist.id}
            />
          ) : activeSection === "earnings" && earningsVisible ? (
            <ArtistEarnings
              key={`${activeArtist.id}-earnings-${sectionViewVersion}`}
              artistId={activeArtist.id}
            />
          ) : activeSection === "team" ? (
            <ArtistTeamManager
              key={`${activeArtist.id}-team-${sectionViewVersion}`}
              artist={activeArtist}
            />
          ) : (
            <PlaceholderSection
              key={`${activeArtist.id}-${activeSection}-${sectionViewVersion}`}
              section={activeSection}
            />
          )}

          {!isMyPage ? (
            <div className="mt-16">
              <Footer showTopBorder={false} pageGutter={false} />
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}