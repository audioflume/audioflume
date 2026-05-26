import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createDesktopToken } from "@/lib/desktopAuth";

function renderTokenPage(token: string) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Filmwave Desktop Token</title>
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
        width: min(720px, calc(100vw - 32px));
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
      textarea {
        width: 100%;
        min-height: 132px;
        margin-top: 20px;
        resize: vertical;
        border: 1px solid var(--border);
        border-radius: 16px;
        background: #0d0d0d;
        color: var(--text);
        padding: 14px;
        font: 12px/1.45 SFMono-Regular, Consolas, monospace;
      }
      button {
        min-height: 40px;
        margin-top: 14px;
        border: 0;
        border-radius: 999px;
        background: var(--accent);
        color: #111111;
        cursor: pointer;
        padding: 0 18px;
        font-weight: 700;
      }
      .status {
        min-height: 20px;
        margin-top: 10px;
        color: var(--muted);
        font-size: 12px;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Connect Filmwave Desktop</h1>
      <p>Copy this desktop token, then paste it into the Filmwave Desktop app. Keep it private; it gives the desktop app access to sync your project files.</p>
      <textarea id="token" readonly>${token}</textarea>
      <button id="copy" type="button">Copy token</button>
      <div class="status" id="status"></div>
    </main>
    <script>
      const token = document.getElementById('token');
      const status = document.getElementById('status');
      document.getElementById('copy').addEventListener('click', async () => {
        token.select();
        await navigator.clipboard.writeText(token.value);
        status.textContent = 'Copied. Return to Filmwave Desktop and paste the token.';
      });
    </script>
  </body>
</html>`;
}

export async function GET(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    const url = new URL(req.url);
    const signInUrl = new URL("/sign-in", url.origin);
    signInUrl.searchParams.set("redirect_url", url.toString());

    return NextResponse.redirect(signInUrl);
  }

  const token = createDesktopToken(userId);

  return new NextResponse(renderTokenPage(token), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST() {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    { token: createDesktopToken(userId) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
