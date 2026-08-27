import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

export default function SignInSsoCallbackPage() {
  return (
    <>
      <AuthenticateWithRedirectCallback
        continueSignUpUrl="/sign-up"
        signInUrl="/sign-in"
      />
      <div id="clerk-captcha" />
    </>
  );
}
