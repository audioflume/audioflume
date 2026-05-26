import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const isPublicRoute = createRouteMatcher(["/sign-in(.*)", "/sign-up(.*)"]);

const DESKTOP_API_ALLOWED_ORIGINS = new Set([
  "http://localhost:1420",
  "http://127.0.0.1:1420",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "tauri://localhost",
  "http://tauri.localhost",
]);

function getCorsOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin && DESKTOP_API_ALLOWED_ORIGINS.has(origin)) {
    return origin;
  }

  return "http://localhost:1420";
}

function applyDesktopCorsHeaders(response: NextResponse, request: NextRequest) {
  response.headers.set("Access-Control-Allow-Origin", getCorsOrigin(request));
  response.headers.set("Access-Control-Allow-Credentials", "true");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Filmwave-Desktop-Dev-Key",
  );
  response.headers.set("Vary", "Origin");

  return response;
}

export default clerkMiddleware(async (auth, request) => {
  if (request.nextUrl.pathname.startsWith("/api/desktop")) {
    if (request.method === "OPTIONS") {
      return applyDesktopCorsHeaders(
        new NextResponse(null, { status: 204 }),
        request,
      );
    }

    return applyDesktopCorsHeaders(NextResponse.next(), request);
  }

  if (!isPublicRoute(request)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
