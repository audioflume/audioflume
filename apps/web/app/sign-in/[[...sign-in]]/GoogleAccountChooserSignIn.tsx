"use client";

import { SignIn } from "@clerk/nextjs";
import { useSignIn } from "@clerk/nextjs/legacy";
import type { MouseEvent } from "react";

type GoogleAccountChooserSignInProps = {
  redirectUrl?: string;
};

const GOOGLE_BUTTON_SELECTOR = [
  ".cl-socialButtonsBlockButton__google",
  ".cl-socialButtonsIconButton__google",
].join(",");

export default function GoogleAccountChooserSignIn({
  redirectUrl,
}: GoogleAccountChooserSignInProps) {
  const { isLoaded, signIn } = useSignIn();

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (!target.closest(GOOGLE_BUTTON_SELECTOR)) return;

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
