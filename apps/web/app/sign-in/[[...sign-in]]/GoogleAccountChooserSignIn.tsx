"use client";

import { SignIn } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type GoogleAccountChooserSignInProps = {
  redirectUrl?: string;
};

type GoogleButtonPortal = {
  target: HTMLElement;
  className: string;
  html: string;
  ariaLabel: string | null;
};

function isGoogleButton(button: HTMLButtonElement) {
  const text = button.textContent?.trim().toLowerCase() || "";
  const ariaLabel = button.getAttribute("aria-label")?.trim().toLowerCase() || "";

  return text.includes("google") || ariaLabel.includes("google");
}

export default function GoogleAccountChooserSignIn({
  redirectUrl,
}: GoogleAccountChooserSignInProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { isLoaded, signIn } = useSignIn();
  const [googleButtonPortal, setGoogleButtonPortal] =
    useState<GoogleButtonPortal | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let hiddenGoogleButton: HTMLButtonElement | null = null;

    function syncGoogleButton() {
      const googleButton = Array.from(
        root.querySelectorAll<HTMLButtonElement>("button"),
      ).find(isGoogleButton);

      if (!googleButton?.parentElement || googleButton === hiddenGoogleButton) {
        return;
      }

      if (hiddenGoogleButton) {
        hiddenGoogleButton.style.removeProperty("display");
      }

      hiddenGoogleButton = googleButton;
      hiddenGoogleButton.style.display = "none";

      setGoogleButtonPortal({
        target: googleButton.parentElement,
        className: googleButton.className,
        html: googleButton.innerHTML,
        ariaLabel: googleButton.getAttribute("aria-label"),
      });
    }

    syncGoogleButton();

    const observer = new MutationObserver(syncGoogleButton);
    observer.observe(root, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      hiddenGoogleButton?.style.removeProperty("display");
    };
  }, []);

  function signInWithGoogle() {
    if (!isLoaded || !signIn) return;

    void signIn
      .authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-in/sso-callback",
        redirectUrlComplete: redirectUrl || "/music",
        oidcPrompt: "select_account",
      })
      .catch((error) => {
        console.error("Google sign-in redirect failed:", error);
      });
  }

  return (
    <div ref={rootRef}>
      <SignIn
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl || "/music"}
      />

      {googleButtonPortal
        ? createPortal(
            <button
              type="button"
              className={googleButtonPortal.className}
              aria-label={googleButtonPortal.ariaLabel || "Continue with Google"}
              onClick={signInWithGoogle}
              dangerouslySetInnerHTML={{ __html: googleButtonPortal.html }}
            />,
            googleButtonPortal.target,
          )
        : null}
    </div>
  );
}
