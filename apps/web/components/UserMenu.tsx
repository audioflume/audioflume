"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import GearIcon from "@/components/icons/GearIcon";
import {
  UserMenuAction,
  UserMenuActions,
  UserMenuGlyph,
  UserMenuHeader,
  UserMenuPanel,
  UserMenuThemeToggle,
  type UserMenuGlyphName,
} from "@filmwave/shared";

function MenuLink({
  href,
  label,
  icon,
  onClose,
}: {
  href: string;
  label: string;
  icon: UserMenuGlyphName;
  onClose?: () => void;
}) {
  if (icon === "settings") {
    return (
      <Link
        href={href}
        className="filmwave-dropdown-item filmwave-user-menu-action"
        onClick={onClose}
      >
        <span className="filmwave-user-menu-action-icon" aria-hidden="true">
          <GearIcon />
        </span>
        <span className="filmwave-user-menu-action-label">{label}</span>
      </Link>
    );
  }

  return (
    <UserMenuAction
      as={Link}
      href={href}
      label={label}
      icon={icon}
      helper=""
      onClick={onClose}
    />
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
  const [pendingArtistInviteCount, setPendingArtistInviteCount] = useState(0);
  const displayName =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Audioflume account";

  useEffect(() => {
    if (!user?.id) {
      setPendingArtistInviteCount(0);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/artists/claim", { cache: "no-store" });
        const body = (await response.json().catch(() => ({}))) as {
          invitations?: unknown[];
        };

        if (!cancelled && response.ok) {
          setPendingArtistInviteCount(
            Array.isArray(body.invitations) ? body.invitations.length : 0,
          );
        }
      } catch {
        if (!cancelled) setPendingArtistInviteCount(0);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <UserMenuPanel>
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

      <UserMenuActions>
        {pendingArtistInviteCount > 0 ? (
          <Link
            href="/artists/claim"
            className="filmwave-dropdown-item filmwave-user-menu-action"
            onClick={onClose}
          >
            <span className="filmwave-user-menu-action-icon" aria-hidden="true">
              <UserMenuGlyph name="profile" />
            </span>
            <span className="filmwave-user-menu-action-label">
              Artist Invitation
            </span>
            <InviteCountBadge count={pendingArtistInviteCount} />
          </Link>
        ) : null}
        <MenuLink
          href="/account/settings"
          label="Settings"
          icon="settings"
          onClose={onClose}
        />
        <MenuLink
          href="/account/membership"
          label="Membership"
          icon="membership"
          onClose={onClose}
        />
        <MenuLink
          href="/account/payment"
          label="Payment"
          icon="payment"
          onClose={onClose}
        />
        <MenuLink
          href="/account/security"
          label="Security"
          icon="security"
          onClose={onClose}
        />
        <MenuLink
          href="/account/support"
          label="Support & FAQ"
          icon="support"
          onClose={onClose}
        />
        <UserMenuThemeToggle theme={theme} onThemeChange={setTheme} />
      </UserMenuActions>

      <UserMenuActions className="filmwave-user-menu-signout">
        <button
          type="button"
          onClick={() => signOut()}
          className="filmwave-dropdown-item filmwave-user-menu-exit"
        >
          <span
            className="filmwave-user-menu-action-icon"
            aria-hidden="true"
            style={{ transform: "scaleX(-1)" }}
          >
            <UserMenuGlyph name="sign-out" />
          </span>
          <span>Sign Out</span>
        </button>
      </UserMenuActions>
    </UserMenuPanel>
  );
}
