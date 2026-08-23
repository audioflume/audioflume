"use client";

import { usePathname } from "next/navigation";
import {
  BackendSidebarHeading,
  BackendSidebarNavItem,
  BackendSidebarScrollArea,
  BackendSidebarShell,
} from "@/components/backend/BackendSidebar";
import { usePlayer } from "@/context/PlayerContext";
import { navItems } from "./accountData";

export default function AccountSidebar() {
  const pathname = usePathname();
  const { currentSong } = usePlayer();

  return (
    <BackendSidebarShell bottom={currentSong ? "64px" : "0px"}>
      <BackendSidebarScrollArea>
        <div className="border-b border-[var(--border)] pb-8">
          <BackendSidebarHeading>Account</BackendSidebarHeading>
          <div className="flex flex-col gap-px">
            {navItems.map((item) => (
              <BackendSidebarNavItem
                key={item.href}
                href={item.href}
                active={pathname === item.href}
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
