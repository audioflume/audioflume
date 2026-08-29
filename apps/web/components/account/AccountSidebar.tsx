"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useEffect, useState } from "react";
import {
  BackendSidebarHeading,
  BackendSidebarNavItem,
  BackendSidebarScrollArea,
  BackendSidebarShell,
} from "@/components/backend/BackendSidebar";
import BackendSidebarGlyph from "@/components/backend/BackendSidebarGlyph";
import GearIcon from "@/components/icons/GearIcon";
import { usePlayer } from "@/context/PlayerContext";
import { useArtistInvites } from "@/context/ArtistInvitesContext";
import {
  UserMenuGlyph,
  type UserMenuGlyphName,
} from "@filmwave/shared";
import { navItems } from "./accountData";
import type { AccountSection } from "./accountTypes";

const ACCOUNT_NOTIFICATIONS_CHANGED_EVENT =
  "audioflume:account-notifications-changed";

const iconBySection: Record<
  Exclude<AccountSection, "notifications">,
  UserMenuGlyphName
> = {
  profile: "profile",
  settings: "settings",
  membership: "membership",
  payment: "payment",
  security: "security",
  support: "support",
};

function InviteCountBadge({ count }: { count: number }) {
  return (
    <span
      className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--danger)] px-1.5 text-[10px] font-medium leading-none text-[var(--danger-contrast)]"
      aria-label={`${count} pending artist ${count === 1 ? "invitation" : "invitations"}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default function AccountSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { currentSong } = usePlayer();
  const { user } = useUser();
  const { pendingInviteCount } = useArtistInvites();
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0);
  const displayName =
    user?.fullName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    "Audioflume Member";
  const email = user?.primaryEmailAddress?.emailAddress || "Audioflume Member";

  useEffect(() => {
    let cancelled = false;

    async function loadNotificationCount() {
      try {
        const response = await fetch("/api/account/notifications", {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as
          | { unread_count?: number }
          | null;

        if (!response.ok || cancelled) return;

        setNotificationUnreadCount(
          typeof payload?.unread_count === "number" ? payload.unread_count : 0,
        );
      } catch {
        if (!cancelled) setNotificationUnreadCount(0);
      }
    }

    function handleNotificationCountChange(event: Event) {
      const customEvent = event as CustomEvent<{ unreadCount?: number }>;
      const unreadCount = customEvent.detail?.unreadCount;

      if (typeof unreadCount === "number") {
        setNotificationUnreadCount(unreadCount);
        return;
      }

      void loadNotificationCount();
    }

    void loadNotificationCount();
    window.addEventListener(
      ACCOUNT_NOTIFICATIONS_CHANGED_EVENT,
      handleNotificationCountChange,
    );

    return () => {
      cancelled = true;
      window.removeEventListener(
        ACCOUNT_NOTIFICATIONS_CHANGED_EVENT,
        handleNotificationCountChange,
      );
    };
  }, [pathname]);

  return (
    <BackendSidebarShell bottom={currentSong ? "64px" : "0px"}>
      <BackendSidebarScrollArea>
        <div className="relative rounded-[10px] border border-[var(--border)] bg-[var(--bg-secondary)] p-3">
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

          {notificationUnreadCount > 0 ? (
            <button
              type="button"
              onClick={() => router.push("/account/notifications")}
              className="absolute -right-2 -top-2 z-10 flex h-5 min-w-5 cursor-pointer items-center justify-center rounded-full bg-[var(--danger)] px-1.5 text-[10px] font-medium leading-none text-[var(--danger-contrast)] ring-2 ring-[var(--bg-primary)]"
              aria-label={`${notificationUnreadCount} unread ${
                notificationUnreadCount === 1 ? "notification" : "notifications"
              }`}
            >
              {notificationUnreadCount > 99 ? "99+" : notificationUnreadCount}
            </button>
          ) : null}
        </div>

        <div className="mt-8 pb-8">
          <BackendSidebarHeading>Account</BackendSidebarHeading>
          <div className="flex flex-col gap-px">
            {navItems.map((item) => (
              <Fragment key={item.href}>
                <BackendSidebarNavItem
                  href={item.href}
                  active={pathname === item.href}
                  leading={
                    item.section === "notifications" ? (
                      <BackendSidebarGlyph name="notifications" />
                    ) : item.section === "settings" ? (
                      <GearIcon />
                    ) : (
                      <UserMenuGlyph name={iconBySection[item.section]} />
                    )
                  }
                >
                  {item.label}
                </BackendSidebarNavItem>

                {item.section === "profile" && pendingInviteCount > 0 ? (
                  <BackendSidebarNavItem
                    href="/artists/claim"
                    active={pathname === "/artists/claim"}
                    leading={<UserMenuGlyph name="profile" />}
                    trailing={<InviteCountBadge count={pendingInviteCount} />}
                  >
                    Artist Invitation
                  </BackendSidebarNavItem>
                ) : null}
              </Fragment>
            ))}
          </div>
        </div>
      </BackendSidebarScrollArea>
    </BackendSidebarShell>
  );
}
