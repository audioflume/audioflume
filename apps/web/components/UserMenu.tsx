"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useClerk, useUser } from "@clerk/nextjs";
import { useTheme } from "@/context/ThemeContext";
import DarkMode from "@/components/icons/DarkMode";
import LightMode from "@/components/icons/LightMode";
import {
  UserMenuAction,
  UserMenuActions,
  UserMenuExitAction,
  UserMenuGroup,
  UserMenuPanel,
  UserMenuProfile,
  UserMenuThemeToggle,
} from "@filmwave/shared";

function IconUser() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c1.4-3.2 4-4.8 7-4.8s5.6 1.6 7 4.8" />
    </svg>
  );
}

function IconGear() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M18.8 5.2l-2.1 2.1M7.3 16.7l-2.1 2.1" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l7 3v5c0 4.4-3 7.9-7 9-4-1.1-7-4.6-7-9V6l7-3z" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8-5.3-2.8-5.3 2.8 1-5.8L3.5 9.7l5.9-.9L12 3.5z" />
    </svg>
  );
}

function IconCard() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="13" rx="2.5" />
      <path d="M3 10.5h18" />
    </svg>
  );
}

function IconHelp() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4c.3-1.4 1.5-2.2 2.9-2.1 1.4.1 2.5 1.1 2.5 2.4 0 1.8-2.6 2-2.6 3.8" />
      <circle cx="12.4" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MenuLink({
  href,
  label,
  icon,
  onClose,
}: {
  href: string;
  label: string;
  icon?: React.ReactNode;
  onClose?: () => void;
}) {
  return (
    <UserMenuAction
      as={Link}
      href={href}
      label={label}
      helper=""
      icon={icon}
      onClick={onClose}
    />
  );
}

export default function UserMenu({ onClose }: { onClose?: () => void }) {
  const { signOut } = useClerk();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    function syncProfileImage() {
      setProfileImage(localStorage.getItem("filmwave-profile-image"));
    }

    syncProfileImage();

    window.addEventListener("storage", syncProfileImage);
    window.addEventListener("filmwave-profile-image-change", syncProfileImage);

    return () => {
      window.removeEventListener("storage", syncProfileImage);
      window.removeEventListener(
        "filmwave-profile-image-change",
        syncProfileImage,
      );
    };
  }, []);

  const initials = user
    ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase()
    : "";

  return (
    <UserMenuPanel>
      <UserMenuProfile
        avatar={
          profileImage ? <img src={profileImage} alt="Profile" /> : initials
        }
        title={user?.fullName || "Account"}
        detail={user?.primaryEmailAddress?.emailAddress || ""}
      />

      <UserMenuActions>
        <UserMenuGroup>
          <MenuLink href="/account/profile" label="Profile" icon={<IconUser />} onClose={onClose} />
          <MenuLink href="/account/settings" label="Settings" icon={<IconGear />} onClose={onClose} />
          <MenuLink href="/account/security" label="Security" icon={<IconShield />} onClose={onClose} />
        </UserMenuGroup>

        <UserMenuGroup>
          <MenuLink href="/account/membership" label="Membership" icon={<IconStar />} onClose={onClose} />
          <MenuLink href="/account/payment" label="Payment" icon={<IconCard />} onClose={onClose} />
        </UserMenuGroup>

        <UserMenuGroup>
          <MenuLink href="/account/support" label="Support & FAQ" icon={<IconHelp />} onClose={onClose} />
          <UserMenuExitAction label="Log Out" trailing="Exit" onClick={() => signOut()} />
        </UserMenuGroup>
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
