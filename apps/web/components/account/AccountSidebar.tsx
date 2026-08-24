"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import {
  BackendSidebarHeading,
  BackendSidebarNavItem,
  BackendSidebarScrollArea,
  BackendSidebarShell,
} from "@/components/backend/BackendSidebar";
import GearIcon from "@/components/icons/GearIcon";
import { usePlayer } from "@/context/PlayerContext";
import {
  UserMenuGlyph,
  type UserMenuGlyphName,
} from "@filmwave/shared";
import { navItems } from "./accountData";
import type { AccountSection } from "./accountTypes";

const iconBySection: Record<AccountSection, UserMenuGlyphName> = {
  profile: "profile",
  settings: "settings",
  membership: "membership",
  payment: "payment",
  security: "security",
  support: "support",
};

export default function AccountSidebar() {
  const pathname = usePathname();
  const { currentSong } = usePlayer();
  const { user } = useUser();
  const displayName =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Audioflume Member";
  const email = user?.primaryEmailAddress?.emailAddress || "Audioflume Member";

  return (
    <BackendSidebarShell bottom={currentSong ? "64px" : "0px"}>
      <BackendSidebarScrollArea>
        <div className="rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-[var(--bg-tertiary)] text-[14px] font-medium text-[var(--text-secondary)]">
              {user?.imageUrl ? (
                <img
                  src={user.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{displayName.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-medium text-[var(--text-primary)]">
                {displayName}
              </div>
              <div className="mt-1.5 truncate text-[10px] text-[var(--text-muted)]">
                {email}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pb-8">
          <BackendSidebarHeading>Account</BackendSidebarHeading>
          <div className="flex flex-col gap-px">
            {navItems.map((item) => (
              <BackendSidebarNavItem
                key={item.href}
                href={item.href}
                active={pathname === item.href}
                leading={
                  item.section === "settings" ? (
                    <GearIcon />
                  ) : (
                    <UserMenuGlyph name={iconBySection[item.section]} />
                  )
                }
              >
                {item.label}
              </BackendSidebarNavItem>
            ))}
          </div>
        </div>
      </BackendSidebarScrollArea>
    </BackendSidebarShell>
  );
}
