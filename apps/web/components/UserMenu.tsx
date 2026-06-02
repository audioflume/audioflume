"use client";

import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import DarkMode from "@/components/icons/DarkMode";
import LightMode from "@/components/icons/LightMode";
import {
  UserMenuAction,
  UserMenuActions,
  UserMenuExitAction,
  UserMenuHeader,
  UserMenuPanel,
  UserMenuThemeToggle,
} from "@filmwave/shared";

function MenuLink({
  href,
  label,
  helper,
  onClose,
}: {
  href: string;
  label: string;
  helper: string;
  onClose?: () => void;
}) {
  return (
    <UserMenuAction
      as={Link}
      href={href}
      label={label}
      helper={helper}
      onClick={onClose}
    />
  );
}

export default function UserMenu({ onClose }: { onClose?: () => void }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();

  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "Account";

  return (
    <UserMenuPanel>
      <UserMenuHeader title={displayName} detail="Lifetime Membership" />

      <UserMenuActions>
        <MenuLink
          href="/account/profile"
          label="Profile"
          helper="Personal info and account details"
          onClose={onClose}
        />

        <MenuLink
          href="/account/settings"
          label="Settings"
          helper="Site preferences and display"
          onClose={onClose}
        />

        <MenuLink
          href="/account/membership"
          label="Membership"
          helper="Plan, license, and usage"
          onClose={onClose}
        />

        <MenuLink
          href="/account/payment"
          label="Payment"
          helper="Billing and invoices"
          onClose={onClose}
        />

        <MenuLink
          href="/account/security"
          label="Security"
          helper="Password and account access"
          onClose={onClose}
        />

        <MenuLink
          href="/account/support"
          label="Support & FAQ"
          helper="Help center and contact options"
          onClose={onClose}
        />

        <UserMenuExitAction label="Log Out" trailing="Exit" onClick={() => signOut()} />
      </UserMenuActions>

      <UserMenuThemeToggle
        theme={theme}
        onThemeChange={setTheme}
        darkIcon={<DarkMode />}
        lightIcon={<LightMode />}
      />
    </UserMenuPanel>
  );
}
