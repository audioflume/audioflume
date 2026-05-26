import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createDesktopToken } from "@/lib/desktopAuth";

const DESKTOP_CALLBACK_URL = "filmwave://auth/callback";

function renderPage({
  message,
  signedIn,
  signInUrl,
}: {
  message: string;
  signedIn: boolean;
  signInUrl: string;
}) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Connect Filmwave Desktop</title>
    <style>
      :root {
        color-scheme: dark;
        --bg: #111111;
        --panel: #171717;
        --border: rgba(255,255,255,0.1);
        --text: #ffffff;
        --muted: rgba(255,255,255,0.55);
        --accent: #ddff43;
      }
      * { box-sizing: border-box; }
      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        background: var(--bg);
        color: var(--text);
        font-family: Arial, Helvetica, sans-serif;
      }
      main {
        width: min(640px, calc(100vw - 32px));
        border: 1px solid var(--border);
        border-radius: 24px;
        background: var(--panel);
        padding: 28px;
      }
      h1 {
        margin: 0;
        font-size: 42px;
        line-height: 0.95;
        letter-spacing: -0.06em;
        font-weight: 500;
      }
      p {
        margin: 14px 0 0;
        color: var(--muted);
        font-size: 14px;
        line-height: 1.55;
      }
      .actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 18px;
      }
      a.button {
        min-height: 40px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border: 0;
        border-radius: 999px;
        background: var(--accent);
        color: #111111;
        cursor: pointer;
        padding: 0 18px;
        font-weight: 700;
        text-decoration: none;
      }
      .secondary {
        background: transparent !important;
        color: var(--text) !important;
        border: 1px solid var(--border) !important;
      }
      .status {
        min-height: 20px;
        margin-top: 12px;
        color: var(--muted);
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Connect Filmwave Desktop</h1>
      <p>${message}</p>
      <div class="actions">
        ${signedIn ? `<a class="button" href="/api/desktop/auth/token?callback=deeplink">Open Filmwave Desktop</a>` : `<a class="button" href="${signInUrl}">Sign in to Filmwave</a>`}
        <a class="button secondary" href="/api/desktop/auth/token?callback=deeplink">Try again</a>
      </div>
      <div class="status">You can close this page after Filmwave Desktop opens.</div>
    </main>
  </body>
</html>`;
}

async function getSignedInUserId() {
  const { userId } = await auth();

  if (userId) return userId;

  const user = await currentUser();

  return user?.id ?? null;
}

function getDesktopCallbackUrl(token: string) {
  const callbackUrl = new URL(DESKTOP_CALLBACK_URL);

  callbackUrl.searchParams.set("token", token);

  return callbackUrl.toString();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shouldDeepLink = url.searchParams.get("callback") === "deeplink";
  const signInUrl = new URL("/sign-in", url.origin);

  signInUrl.searchParams.set("redirect_url", url.toString());

  const userId = await getSignedInUserId();

  if (!userId) {
    return new NextResponse(
      renderPage({
        message:
          "Sign in with your normal Filmwave account. After signing in, this page will open the desktop app automatically.",
        signedIn: false,
        signInUrl: signInUrl.toString(),
      }),
      {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        },
      },
    );
  }

  const token = createDesktopToken(userId);

  if (shouldDeepLink) {
    return NextResponse.redirect(getDesktopCallbackUrl(token));
  }

  return new NextResponse(
    renderPage({
      message:
        "You are signed in. Click the button below to connect Filmwave Desktop.",
      signedIn: true,
      signInUrl: signInUrl.toString(),
    }),
    {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

export async function POST() {
  const userId = await getSignedInUserId();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { token: createDesktopToken(userId) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
