"use client";

import Logo from "@/components/Logo";

const productLinks = ["Music", "SFX", "VFX", "Colour", "Curated"];
const companyLinks = ["Home", "Support", "About", "Partnerships", "Contact"];

const footerHeaderClass =
  "text-[9px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]";

const footerLinkClass =
  "cursor-pointer leading-none transition hover:text-[var(--text-primary)]";

export default function Footer() {
  return (
    <footer
      className="text-[11px] font-medium text-[var(--text-muted)]"
      style={{
        paddingBottom: "8px",
      }}
    >
      <div className="grid gap-8 pb-6 md:grid-cols-[minmax(160px,1fr)_auto_auto_minmax(150px,auto)] md:gap-10">
        <div className="flex -translate-y-1 flex-col gap-3">
          <div className="w-[92px] text-[var(--text-muted)]">
            <Logo />
          </div>

          <span className="max-w-[180px] text-[11px] leading-4 text-[var(--text-muted)]">
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

      <div className="flex min-h-9 items-center justify-between border-t border-[var(--border-subtle)] text-[10px] leading-none text-[var(--text-muted)]">
        <span>© 2026 Filmwave</span>
        <span>All rights reserved</span>
      </div>
    </footer>
  );
}
