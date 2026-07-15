"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import FooterBottom from "@/components/FooterBottom";
import { usePlayer } from "@/context/PlayerContext";

// Recovery deployment: runtime behavior is unchanged.
const productLinks = ["Music", "SFX", "VFX", "Colour", "Curated"];
const companyLinks = ["Home", "Support", "About", "Partnerships", "Contact"];

const footerHeaderClass =
  "text-[8px] font-normal uppercase tracking-[0.08em] text-[var(--text-muted)]";

const footerLinkClass =
  "cursor-pointer font-normal leading-none transition hover:text-[var(--text-primary)]";

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
      `}</style>

      <footer
        ref={footerRef}
        className={`box-border w-full pt-10 text-[10px] font-normal text-[var(--text-muted)] ${className}`}
        style={{
          paddingBottom: playerPadding
            ? playerVisible
              ? "calc(72px + 8px)"
              : "8px"
            : "8px",
        }}
      >
        <div className="grid gap-8 pb-6 md:grid-cols-[minmax(160px,1fr)_auto_auto_minmax(150px,auto)] md:gap-10">
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

          <div className="grid gap-2.5">
            <span className={footerHeaderClass}>Library</span>

            <div className="grid gap-2.5">
              {productLinks.map((link) => (
                <span key={link} className={footerLinkClass}>
                  {link}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-2.5">
            <span className={footerHeaderClass}>Company</span>

            <div className="grid gap-2.5">
              {companyLinks.map((link) => (
                <span key={link} className={footerLinkClass}>
                  {link}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-rows-[auto_1fr] gap-2.5">
            <span className={footerHeaderClass}>Contact</span>

            <div className="grid content-end gap-2.5">
              <span className="leading-none">+1 (250) 667-0766</span>
              <span className="leading-none">hello@filmwave.io</span>
              <span className="leading-none">Made in Canada</span>
            </div>
          </div>
        </div>

        <FooterBottom />
      </footer>
    </>
  );
}
