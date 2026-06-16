"use client";

import Link from "next/link";
import { useClerk } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import DarkMode from "@/components/icons/DarkMode";
import LightMode from "@/components/icons/LightMode";
import {
  UserMenuAction,
  UserMenuActions,
  UserMenuExitAction,
  UserMenuPanel,
  UserMenuThemeToggle,
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
    <UserMenuAction
      as={Link}
      href={href}
      label={label}
      helper=""
      onClick={onClose}
    />
  );
}

export default function UserMenu({ onClose }: { onClose?: () => void }) {
  const { signOut } = useClerk();
  const { theme, setTheme } = useTheme();

  return (
    <UserMenuPanel>
      <UserMenuActions>
        <MenuLink href="/account/profile" label="Profile" onClose={onClose} />
        <MenuLink href="/account/settings" label="Settings" onClose={onClose} />
        <MenuLink href="/account/membership" label="Membership" onClose={onClose} />
        <MenuLink href="/account/payment" label="Payment" onClose={onClose} />
        <MenuLink href="/account/security" label="Security" onClose={onClose} />
        <MenuLink href="/account/support" label="Support & FAQ" onClose={onClose} />
        <UserMenuExitAction label="Sign out" trailing="Exit" onClick={() => signOut()} />
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
