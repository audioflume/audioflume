import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest, type NextFetchEvent } from "next/server";
import { refreshSupabaseSsrPreview } from "@/lib/supabaseSsrPreviewRefresh";
import { refreshSupabaseAccountSession } from "@/lib/auth/refreshSupabaseAccountSession";
import { shouldRefreshAccountSession } from "@/lib/auth/shouldRefreshAccountSession";
import { selectAccountAuthProvider } from "@/lib/auth/selectAccountAuthProvider";
import { selectDesktopAuthProvider } from "@/lib/auth/selectDesktopAuthProvider";
import { isMigratedAccountPage } from "@/lib/auth/isMigratedAccountPage";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/auth-preview(.*)",
  "/artists/claim(.*)",
  "/artists/earnings",
  "/artists/licensing",
  "/pricing",
  "/music",
  "/sound-fx",
  "/discover",
  "/curated-playlists(.*)",
  "/community-playlists(.*)",
]);

const RESERVED_ARTIST_ROUTES = new Set([
  "apply",
  "claim",
  "dashboard",
  "earnings",
  "licensing",
]);

function isPublicArtistContentRoute(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);

  if (segments[0] !== "artists" || !segments[1]) return false;
  if (RESERVED_ARTIST_ROUTES.has(segments[1])) return false;

  if (segments.length === 2) return true;

  return (
    segments.length === 4 &&
    segments[2] === "albums" &&
    Boolean(segments[3])
  );
}

function isPublicPlaylistDetailRoute(pathname: string) {
  const segments = pathname.split("/").filter(Boolean);
  return segments.length === 2 && segments[0] === "playlists";
}

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
    "Content-Type, Authorization, X-Audioflume-Desktop-Dev-Key, X-Filmwave-Desktop-Dev-Key",
  );
  response.headers.set("Vary", "Origin");

  return response;
}

const clerkRequestMiddleware = clerkMiddleware(async (auth, request) => {
  // The SSR preview is public and maintains only its own Supabase cookie session.
  // Every production route and desktop API continues through the existing Clerk flow.
  if (request.nextUrl.pathname === "/auth-preview/ssr") {
    return refreshSupabaseSsrPreview(request);
  }

  // Test the future cookie independently; never replace Clerk automatically.
  if (request.nextUrl.pathname === "/auth-preview/cutover") {
    return refreshSupabaseAccountSession(request);
  }

  // OAuth exchange has its own verified owner check. Permit only this exact
  // callback when Supabase is explicitly selected; all other protected
  // website routes remain behind Clerk until a reviewed cutover.
  if (
    request.nextUrl.pathname === "/auth/supabase/callback" &&
    selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === "supabase"
  ) {
    return NextResponse.next();
  }

  // Only refresh migrated account API sessions when the server operator
  // explicitly opts into the Supabase migration. Desktop remains untouched.
  if (
    selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === "supabase" &&
    shouldRefreshAccountSession(request.nextUrl.pathname)
  ) {
    return refreshSupabaseAccountSession(request);
  }

  if (
    request.nextUrl.pathname === "/playlists" &&
    request.nextUrl.searchParams.get("tab") === "community-playlists"
  ) {
    return NextResponse.redirect(new URL("/playlists/community", request.url));
  }

  // Artist pages whose APIs verify the linked owner use the Supabase
  // cookie when selected; Clerk must not protect their page HTML first.
  if (
    selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === "supabase" &&
    (request.nextUrl.pathname === "/artists/dashboard" ||
      request.nextUrl.pathname === "/artists/apply")
  ) {
    return refreshSupabaseAccountSession(request, { requireVerifiedUser: true });
  }
  if (
    selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === "supabase" &&
    request.nextUrl.pathname === "/artists/claim"
  ) {
    return refreshSupabaseAccountSession(request);
  }

  // Supabase admin pages are guarded twice: verified session here and a
  // server-trusted requireAdmin() check in app/admin/layout.tsx.
  if (
    selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === "supabase" &&
    (request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/"))
  ) {
    return refreshSupabaseAccountSession(request, { requireVerifiedUser: true });
  }

  // Only account-data-backed client pages may use the Supabase page guard
  // when the server opts in. Admin, artist, account settings and desktop
  // retain the existing Clerk path. APIs still verify legacy ownership.
  if (
    selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === "supabase" &&
    isMigratedAccountPage(request.nextUrl.pathname)
  ) {
    return refreshSupabaseAccountSession(request, { requireVerifiedUser: true });
  }

  if (request.nextUrl.pathname.startsWith("/api/desktop")) {
    if (request.method === "OPTIONS") {
      return applyDesktopCorsHeaders(
        new NextResponse(null, { status: 204 }),
        request,
      );
    }

    return applyDesktopCorsHeaders(NextResponse.next(), request);
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const pathname = request.nextUrl.pathname;
  const isPublicContentRoute =
    isPublicArtistContentRoute(pathname) ||
    isPublicPlaylistDetailRoute(pathname);

  if (!isPublicRoute(request) && !isPublicContentRoute) {
    await auth.protect();
  }
});


// Explicit Supabase website cutover: avoid running Clerk's development-session
// handshake before paths that already have their own Supabase session handling.
// Clerk remains the default provider, and unconverted private pages continue
// through the existing Clerk middleware instead of silently changing access.
export default function middleware(request: NextRequest, event: NextFetchEvent) {
  if (selectAccountAuthProvider(process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER) === "supabase") {
    const pathname = request.nextUrl.pathname;

    // Both browser entry pages and the OAuth exchange have their own provider-
    // selected authorization logic. Never redirect them through Clerk.
    if (
      pathname === "/sign-in" || pathname.startsWith("/sign-in/") ||
      pathname === "/sign-up" || pathname.startsWith("/sign-up/") ||
      pathname === "/auth/supabase/callback"
    ) {
      return NextResponse.next();
    }

    if (pathname === "/auth-preview/ssr") return refreshSupabaseSsrPreview(request);
    if (pathname === "/auth-preview/cutover") return refreshSupabaseAccountSession(request);

    if (shouldRefreshAccountSession(pathname)) {
      return refreshSupabaseAccountSession(request);
    }

    if (
      pathname === "/playlists" &&
      request.nextUrl.searchParams.get("tab") === "community-playlists"
    ) {
      return NextResponse.redirect(new URL("/playlists/community", request.url));
    }

    if (pathname === "/artists/dashboard" || pathname === "/artists/apply") {
      return refreshSupabaseAccountSession(request, { requireVerifiedUser: true });
    }
    if (pathname === "/artists/claim") {
      return refreshSupabaseAccountSession(request);
    }
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      // app/admin/layout.tsx independently enforces server-trusted admin role.
      return refreshSupabaseAccountSession(request, { requireVerifiedUser: true });
    }
    if (isMigratedAccountPage(pathname)) {
      return refreshSupabaseAccountSession(request, { requireVerifiedUser: true });
    }

    // Only bypass Clerk for desktop when BOTH desktop and website providers
    // explicitly opt into Supabase. Bearer authorization stays in each API.
    if (
      pathname.startsWith("/api/desktop") &&
      selectDesktopAuthProvider(
        process.env.AUDIOFLUME_DESKTOP_AUTH_PROVIDER,
        process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER,
      ) === "supabase"
    ) {
      if (request.method === "OPTIONS") {
        return applyDesktopCorsHeaders(
          new NextResponse(null, { status: 204 }),
          request,
        );
      }
      return applyDesktopCorsHeaders(NextResponse.next(), request);
    }

    // When desktop stays Clerk, retain its original middleware context.
    // Never drop Clerk's desktop handling merely because web opted in first.
    if (pathname.startsWith("/api/desktop")) {
      return clerkRequestMiddleware(request, event);
    }

    // Existing account, artist, and admin APIs still enforce authorization
    // server-side. Bypassing Clerk does not authorize any API request.
    if (pathname.startsWith("/api/")) {
      return NextResponse.next();
    }

    const isPublicContentRoute =
      isPublicArtistContentRoute(pathname) ||
      isPublicPlaylistDetailRoute(pathname);
    if (isPublicRoute(request) || isPublicContentRoute) {
      return NextResponse.next();
    }
  }

  return clerkRequestMiddleware(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
