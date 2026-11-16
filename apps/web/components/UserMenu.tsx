"use client";

import Link from "next/link";
import { useState } from "react";
import styles from "./UserMenu.module.css";
import LightMode from "@/components/icons/LightMode";
import DarkMode from "@/components/icons/DarkMode";
import { useAccountSession } from "@/context/AccountSessionContext";
import { useTheme } from "@/context/ThemeContext";
import { useArtistInvites } from "@/context/ArtistInvitesContext";
import { useProjectsContext } from "@/context/ProjectsContext";
import CreateProjectModal from "@/components/CreateProjectModal";
import {
  UserMenuActions,
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
  const { signOut, user } = useAccountSession();
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
          detail="My Account"
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

      {pendingInviteCount > 0 ? (
        <UserMenuActions className="filmwave-web-user-menu-invite-section">
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
        </UserMenuActions>
      ) : null}

      <UserMenuActions className="filmwave-web-user-menu-library-section">
        <MenuLink
          href="/projects"
          label="My Projects"
          onClose={onClose}
        />
        <button
          type="button"
          className="filmwave-dropdown-item filmwave-user-menu-action"
        >
          <span className="filmwave-user-menu-action-label">My Licenses</span>
        </button>
      </UserMenuActions>

      <UserMenuActions className="filmwave-web-user-menu-account-section">
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
          onClick={async () => {
            await signOut();
            window.location.assign("/sign-in");
          }}
          className="filmwave-dropdown-item filmwave-user-menu-exit"
        >
          <span>Sign Out</span>
        </button>
      </UserMenuActions>

      <UserMenuActions className="filmwave-user-menu-signout">
        <div className={styles.appearanceOptions} role="group" aria-label="Appearance">
          <button
            type="button"
            className={`${styles.appearanceOption} ${styles.lightOption}`}
            onClick={() => setTheme("light")}
            aria-label="Light mode"
            aria-pressed={theme === "light"}
          >
            <LightMode />
          </button>
          <button
            type="button"
            className={`${styles.appearanceOption} ${styles.darkOption}`}
            onClick={() => setTheme("dark")}
            aria-label="Dark mode"
            aria-pressed={theme === "dark"}
          >
            <DarkMode />
          </button>
        </div>
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
