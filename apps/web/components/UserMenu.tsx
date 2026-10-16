"use client";

import Link from "next/link";
import { useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import { useArtistInvites } from "@/context/ArtistInvitesContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import CreateProjectModal from "@/components/CreateProjectModal";
import {
  UserMenuActions,
  UserMenuGlyph,
  UserMenuHeader,
  UserMenuPanel,
} from "@filmwave/shared";

function MenuLink({
  href,
  label,
  onClose,
}: {
  href: string;
  label: string;
  onClose?: () => void;
}) {
  return (
    <Link
      href={href}
      className="filmwave-dropdown-item filmwave-user-menu-action"
      onClick={onClose}
    >
      <span className="filmwave-user-menu-action-label">{label}</span>
    </Link>
  );
}

function InviteCountBadge({ count }: { count: number }) {
  return (
    <span
      className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--status-error)] px-1.5 text-[10px] font-medium leading-none text-white"
      aria-label={`${count} pending artist ${count === 1 ? "invitation" : "invitations"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function UserMenu({ onClose }: { onClose?: () => void }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const { pendingInviteCount } = useArtistInvites();
  const { refetchProjects } = useProjectsContext();
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const displayName =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Audioflume account";

  return (
    <>
      <UserMenuPanel className="filmwave-web-user-menu">
      <Link
        href="/account/profile"
        className="filmwave-user-menu-profile-link"
        onClick={onClose}
      >
        <UserMenuHeader
          title={displayName}
          detail="View Profile"
          imageSrc={user?.imageUrl}
        />
      </Link>

      <div className="filmwave-web-user-menu-new-project">
        <button
          type="button"
          className="filmwave-dropdown-item filmwave-user-menu-action filmwave-web-user-menu-new-project-button"
          onClick={() => setCreateProjectOpen(true)}
        >
          <span className="filmwave-web-user-menu-new-project-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M12 6v12M6 12h12" />
            </svg>
          </span>
          <span className="filmwave-user-menu-action-label">New Project</span>
        </button>
      </div>

      <UserMenuActions>
        {pendingInviteCount > 0 ? (
          <Link
            href="/artists/claim"
            className="filmwave-dropdown-item filmwave-user-menu-action"
            onClick={onClose}
          >
            <span className="filmwave-user-menu-action-label">
              Artist Invitation
            </span>
            <InviteCountBadge count={pendingInviteCount} />
          </Link>
        ) : null}
        <MenuLink
          href="/projects"
          label="My Projects"
          onClose={onClose}
        />
        <MenuLink
          href="/account/settings"
          label="Settings"
          onClose={onClose}
        />
        <MenuLink
          href="/account/membership"
          label="Membership"
          onClose={onClose}
        />
        <MenuLink
          href="/account/payment"
          label="Payment"
          onClose={onClose}
        />
        <MenuLink
          href="/account/security"
          label="Security"
          onClose={onClose}
        />
        <MenuLink
          href="/account/support"
          label="Support & FAQ"
          onClose={onClose}
        />
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="filmwave-dropdown-item filmwave-user-menu-theme-action"
          aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          <span className="filmwave-user-menu-action-label">Appearance</span>
          <span className="filmwave-web-user-menu-theme-current">
            <span className="filmwave-user-menu-theme-value">
              {theme === "dark" ? "Dark" : "Light"}
            </span>
            <span className="filmwave-user-menu-theme-icon" aria-hidden="true">
              <UserMenuGlyph name="appearance" />
            </span>
          </span>
        </button>
      </UserMenuActions>

      <UserMenuActions className="filmwave-user-menu-signout">
        <button
          type="button"
          onClick={() => signOut()}
          className="filmwave-dropdown-item filmwave-user-menu-exit"
        >
          <span>Sign Out</span>
        </button>
      </UserMenuActions>
      </UserMenuPanel>

      <CreateProjectModal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onProjectCreated={() => {
          void refetchProjects();
        }}
      />
    </>
  );
}
