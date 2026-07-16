"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import FooterBottom from "@/components/FooterBottom";
import { usePlayer } from "@/context/PlayerContext";

const primaryLinks = [
  { href: "/music", label: "Browse music" },
  { href: "/curated-playlists", label: "Curated playlists" },
  { href: "/account/support", label: "Support" },
];

const sitemapSections = [
  {
    label: "Library",
    links: [
      { href: "/discover", label: "Discover" },
      { href: "/music", label: "Music" },
      { href: "/sound-fx", label: "Sound FX" },
    ],
  },
  {
    label: "Workspace",
    links: [
      { href: "/playlists", label: "My playlists" },
      { href: "/favorites", label: "Favorites" },
      { href: "/projects", label: "Projects" },
    ],
  },
  {
    label: "Account",
    links: [
      { href: "/account/profile", label: "Profile" },
      { href: "/account/membership", label: "Membership" },
      { href: "/account/settings", label: "Settings" },
    ],
  },
];

const footerHeaderClass =
  "text-[8px] font-normal uppercase tracking-[0.08em] text-[var(--text-muted)]";

const footerPrimaryLinkClass =
  "inline-flex w-fit items-center gap-1.5 font-normal leading-none text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none";

const footerSitemapLinkClass =
  "inline-flex w-fit font-normal leading-none text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none";

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
        <div className="grid gap-8 pb-6 md:grid-cols-[minmax(160px,1fr)_minmax(420px,auto)] md:items-start md:gap-12">
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

          <div className="grid gap-8 md:justify-self-end">
            <div className="flex flex-wrap gap-x-5 gap-y-2.5 md:justify-end">
              {primaryLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={footerPrimaryLinkClass}
                >
                  {link.label}
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>

            <nav
              aria-label="Footer sitemap"
              className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4 md:gap-10"
            >
              {sitemapSections.map((section) => (
                <div key={section.label} className="grid content-start gap-3">
                  <span className={footerHeaderClass}>{section.label}</span>

                  <div className="grid gap-2.5">
                    {section.links.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={footerSitemapLinkClass}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}

              <div className="grid content-start gap-3">
                <span className={footerHeaderClass}>Contact</span>

                <div className="grid gap-2.5">
                  <a
                    href="mailto:hello@filmwave.io"
                    className={footerSitemapLinkClass}
                  >
                    hello@filmwave.io
                  </a>
                  <span className="leading-none">Made in Canada</span>
                </div>
              </div>
            </nav>
          </div>
        </div>

        <FooterBottom className="filmwave-footer-bottom" />
      </footer>
    </>
  );
}
