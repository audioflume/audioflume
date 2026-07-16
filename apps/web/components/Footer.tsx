"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import FooterBottom from "@/components/FooterBottom";
import { usePlayer } from "@/context/PlayerContext";

const footerHeaderClass =
  "text-[8px] font-normal uppercase tracking-[0.08em] text-[var(--text-muted)]";

const footerLinkClass =
  "inline-flex w-fit items-center gap-1.5 font-normal leading-none text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none";

type FooterProps = {
  className?: string;
  playerPadding?: boolean;
};

export default function Footer({
  className = "",
  playerPadding = true,
}: FooterProps) {
  const { currentSong } = usePlayer();
  const pathname = usePathname();
  const footerRef = useRef<HTMLElement | null>(null);
  const playerVisible = Boolean(currentSong);

  useEffect(() => {
    const parent = footerRef.current?.parentElement;
    if (!parent) return;

    const inlinePaddingBottom = parent.style.paddingBottom;

    if (inlinePaddingBottom === "72px" || inlinePaddingBottom === "8px") {
      parent.style.paddingBottom = "0px";
    }
  }, [playerVisible]);

  if (pathname === "/music") return null;

  return (
    <>
      <style>{`
        .filmwave-footer-tonal-wordmark.filmwave-header-tonal-wordmark {
          color: var(--text-muted) !important;
          font-size: 17px !important;
          transform: none !important;
        }

        .filmwave-footer-bottom {
          border-top: 0 !important;
        }
      `}</style>

      <footer
        ref={footerRef}
        className={`box-border w-full bg-[var(--bg-tertiary)] pt-10 text-[10px] font-normal text-[var(--text-muted)] ${className}`}
        style={{
          paddingBottom: playerPadding
            ? playerVisible
              ? "calc(72px + 8px)"
              : "8px"
            : "8px",
        }}
      >
        <div className="grid gap-8 pb-6 md:grid-cols-[minmax(160px,1fr)_minmax(280px,auto)] md:items-end md:gap-12">
          <div className="flex -translate-y-1 flex-col gap-3">
            <div className="w-[92px]">
              <span className="filmwave-header-tonal-wordmark filmwave-footer-tonal-wordmark">
                audioflume
              </span>
            </div>

            <span className="max-w-[180px] text-[10px] font-normal leading-4 text-[var(--text-muted)]">
              Music and creative assets for filmmakers.
            </span>
          </div>

          <div className="grid gap-3 md:justify-items-end md:text-right">
            <span className={footerHeaderClass}>Made for the edit</span>

            <p className="max-w-[320px] text-[10px] font-normal leading-4 text-[var(--text-muted)]">
              Find the music, sound, and creative tools that help the cut come together.
            </p>

            <div className="flex flex-wrap gap-x-5 gap-y-2.5 md:justify-end">
              <Link href="/music" className={footerLinkClass}>
                Browse music
                <span aria-hidden="true">↗</span>
              </Link>

              <Link href="/curated-playlists" className={footerLinkClass}>
                Curated playlists
                <span aria-hidden="true">↗</span>
              </Link>

              <a href="mailto:hello@filmwave.io" className={footerLinkClass}>
                Contact
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>

        <FooterBottom className="filmwave-footer-bottom" />
      </footer>
    </>
  );
}
