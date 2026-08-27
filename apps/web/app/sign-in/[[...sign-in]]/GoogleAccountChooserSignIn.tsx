"use client";

import { SignIn } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import type { MouseEvent } from "react";

type GoogleAccountChooserSignInProps = {
  redirectUrl?: string;
};

function isGoogleButton(button: HTMLButtonElement) {
  const text = button.textContent?.trim().toLowerCase() || "";
  const ariaLabel = button.getAttribute("aria-label")?.trim().toLowerCase() || "";

  return text.includes("google") || ariaLabel.includes("google");
}

export default function GoogleAccountChooserSignIn({
  redirectUrl,
}: GoogleAccountChooserSignInProps) {
  const { isLoaded, signIn } = useSignIn();

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const button = target.closest("button");
    if (!(button instanceof HTMLButtonElement) || !isGoogleButton(button)) return;

    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();

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
    <div onClickCapture={handleClickCapture}>
      <SignIn
        forceRedirectUrl={redirectUrl}
        fallbackRedirectUrl={redirectUrl || "/music"}
      />
    </div>
  );
}
