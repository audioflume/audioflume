"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";
import SupabaseAccountAuthForm from "./SupabaseAccountAuthForm";
import { safeAuthRedirect } from "@/lib/auth/safeAuthRedirect";
import styles from "./WebsiteAuthModal.module.css";

type AuthMode = "sign-in" | "sign-up";
type ModalState = { mode: AuthMode; next: string } | null;

export default function WebsiteAuthModal({ provider }: { provider: "clerk" | "supabase" }) {
  const [modal, setModal] = useState<ModalState>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function interceptAuthLinks(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      if (window.location.pathname.startsWith("/sign-in") || window.location.pathname.startsWith("/sign-up")) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.target && anchor.target !== "_self" || anchor.hasAttribute("download")) return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname !== "/sign-in" && url.pathname !== "/sign-up") return;
      // Recovery and OAuth status links must continue to use their dedicated routes.
      if (url.searchParams.has("mode") || url.searchParams.has("auth_status")) return;

      event.preventDefault();
      setModal({
        mode: url.pathname === "/sign-up" ? "sign-up" : "sign-in",
        next: safeAuthRedirect(url.searchParams.get("redirect_url") || url.searchParams.get("redirectUrl") || url.searchParams.get("redirect_url_complete")),
      });
    }

    document.addEventListener("click", interceptAuthLinks, true);
    return () => document.removeEventListener("click", interceptAuthLinks, true);
  }, []);

  useEffect(() => {
    if (!modal) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setModal(null);
      if (event.key !== "Tab") return;
      const panel = document.querySelector<HTMLElement>("[data-audioflume-auth-dialog]");
      if (!panel) return;
      const items = Array.from(panel.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter((item) => item.getClientRects().length > 0);
      if (items.length === 0) return;
      if (event.shiftKey && document.activeElement === items[0]) {
        event.preventDefault();
        items[items.length - 1].focus();
      } else if (!event.shiftKey && document.activeElement === items[items.length - 1]) {
        event.preventDefault();
        items[0].focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, [modal]);

  if (!modal) return null;

  return (
    <div className={styles.backdrop} onMouseDown={(event) => {
      if (event.target === event.currentTarget) setModal(null);
    }}>
      <section className={styles.dialog} role="dialog" aria-modal="true" aria-label="Audioflume account" data-audioflume-auth-dialog>
        <div className={styles.formPanel}>
          <div className={styles.brand}>audioflume</div>
          {provider === "supabase" ? (
            <SupabaseAccountAuthForm key={modal.mode} initialMode={modal.mode} next={modal.next} modal />
          ) : (
            <div className={styles.clerkForm}>
              {modal.mode === "sign-in" ? (
                <SignIn routing="hash" forceRedirectUrl={modal.next} fallbackRedirectUrl={modal.next} />
              ) : (
                <SignUp routing="hash" forceRedirectUrl={modal.next} fallbackRedirectUrl={modal.next} />
              )}
            </div>
          )}
        </div>
        <div className={styles.imagePanel} aria-hidden="true">
          <div className={styles.imageCaption}>
            <p className={styles.imageHeadline}>Human made music.<br />Story driven sound.</p>
            <p>Find the sound that brings your story to life.</p>
          </div>
        </div>
        <button ref={closeButtonRef} type="button" className={styles.close} aria-label="Close account modal" onClick={() => setModal(null)}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M5 5L19 19M19 5L5 19" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </section>
    </div>
  );
}
