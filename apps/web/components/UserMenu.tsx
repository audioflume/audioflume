"use client";

import Link from "next/link";
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

export default function UserMenu({ onClose }: { onClose?: () => void }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const displayName =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Audioflume account";

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
