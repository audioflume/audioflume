"use client";

import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useEffect, useLayoutEffect, useState } from "react";

const ROOT_CLASS = "filmwave-artist-invite-banner-active";
const PENDING_ROOT_CLASS = "filmwave-artist-invite-pending";

export default function ArtistInviteBanner() {
  const { user } = useUser();
  const [pendingInviteCount, setPendingInviteCount] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const visible = pendingInviteCount > 0 && !dismissed;

  useEffect(() => {
    setDismissed(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setPendingInviteCount(0);
      return;
    }

    let cancelled = false;

    async function loadInvites() {
      try {
        const response = await fetch("/api/artists/claim", { cache: "no-store" });
        const body = (await response.json().catch(() => ({}))) as {
          invitations?: unknown[];
        };

        if (!cancelled && response.ok) {
          setPendingInviteCount(
            Array.isArray(body.invitations) ? body.invitations.length : 0,
          );
        }
      } catch {
        if (!cancelled) setPendingInviteCount(0);
      }
    }

    void loadInvites();
    window.addEventListener("focus", loadInvites);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", loadInvites);
    };
  }, [user?.id]);

  useLayoutEffect(() => {
    document.documentElement.classList.toggle(ROOT_CLASS, visible);

    return () => {
      document.documentElement.classList.remove(ROOT_CLASS);
    };
  }, [visible]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const hasPendingInvites = pendingInviteCount > 0;
    const badgeCount = pendingInviteCount > 99 ? "99+" : String(pendingInviteCount);

    root.classList.toggle(PENDING_ROOT_CLASS, hasPendingInvites);

    if (hasPendingInvites) {
      root.style.setProperty(
        "--filmwave-artist-invite-count",
        `"${badgeCount}"`,
      );
    } else {
      root.style.removeProperty("--filmwave-artist-invite-count");
    }

    return () => {
      root.classList.remove(PENDING_ROOT_CLASS);
      root.style.removeProperty("--filmwave-artist-invite-count");
    };
  }, [pendingInviteCount]);

  if (pendingInviteCount === 0) return null;

  const message =
    pendingInviteCount === 1
      ? "You have a pending artist invitation"
      : `You have ${pendingInviteCount} pending artist invitations`;

  return (
    <>
      <style>{`
        :root {
          --filmwave-web-header-base-height: 75px;
          --filmwave-artist-invite-banner-height: 38px;
        }

        html.${ROOT_CLASS} {
          --filmwave-header-height: calc(
            var(--filmwave-web-header-base-height) +
              var(--filmwave-artist-invite-banner-height)
          );
        }

        html.${ROOT_CLASS} .filmwave-web-header {
          --filmwave-header-height: var(--filmwave-web-header-base-height);
          height: var(--filmwave-web-header-base-height);
          transform: translateY(var(--filmwave-artist-invite-banner-height));
        }

        html.${PENDING_ROOT_CLASS}
          .filmwave-web-header
          .filmwave-header-account-trigger {
          position: relative;
        }

        html.${PENDING_ROOT_CLASS}
          .filmwave-web-header
          .filmwave-header-account-trigger::after {
          content: var(--filmwave-artist-invite-count);
          position: absolute;
          top: -6px;
          right: -6px;
          z-index: 10;
          box-sizing: border-box;
          display: flex;
          min-width: 20px;
          height: 20px;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: var(--status-error);
          padding: 0 5px;
          color: #fff;
          font-size: 10px;
          font-weight: 500;
          line-height: 1;
          box-shadow: 0 0 0 2px var(--bg-primary);
          pointer-events: none;
        }
      `}</style>

      {visible ? (
        <div className="fixed left-0 right-0 top-0 z-[130] h-[38px] bg-[#111] text-white">
          <Link
            href="/artists/claim"
            className="flex h-full w-full items-center justify-center px-14 text-center font-[family-name:var(--font-aktiv-grotesk)] text-[11.5px] font-medium tracking-[0.005em] text-white no-underline"
          >
            <span>{message}</span>
            <span className="ml-2 text-white/60">Review now</span>
          </Link>

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="absolute right-4 top-1/2 z-10 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center border-0 bg-transparent p-0 text-white/60 transition-colors duration-150 hover:text-white"
            aria-label="Dismiss artist invitation notification"
          >
            <svg width="19" height="19" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path
                d="m2.25 2.25 7.5 7.5M9.75 2.25l-7.5 7.5"
                stroke="currentColor"
                strokeWidth="0.9"
              />
            </svg>
          </button>
        </div>
      ) : null}
    </>
  );
}
