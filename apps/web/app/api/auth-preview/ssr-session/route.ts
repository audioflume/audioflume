import type { NextRequest } from "next/server";
import { createPreviewSsrRequest } from "@/lib/auth-preview/createPreviewSsrRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// The preview returns only a verified boolean, never session credentials.
export async function GET(request: NextRequest) {
  const { getVerifiedUserId, respond } = createPreviewSsrRequest(request);
  try {
    return respond({ authenticated: Boolean(await getVerifiedUserId()) });
  } catch (error) {
    console.error("SSR preview session verification failed:", error);
    return respond({ authenticated: false }, 500);
  }
}
