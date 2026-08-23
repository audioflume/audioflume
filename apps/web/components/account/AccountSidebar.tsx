"use client";

import { usePathname } from "next/navigation";
import {
  BackendSidebarHeading,
  BackendSidebarNavItem,
  BackendSidebarScrollArea,
  BackendSidebarShell,
} from "@/components/backend/BackendSidebar";
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

  return (
    <BackendSidebarShell bottom={currentSong ? "64px" : "0px"}>
      <BackendSidebarScrollArea>
        <div className="pb-8">
          <BackendSidebarHeading>Account</BackendSidebarHeading>
          <div className="flex flex-col gap-px">
            {navItems.map((item) => (
              <BackendSidebarNavItem
                key={item.href}
                href={item.href}
                active={pathname === item.href}
                leading={<UserMenuGlyph name={iconBySection[item.section]} />}
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
