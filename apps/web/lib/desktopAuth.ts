import { selectDesktopAuthProvider } from "@/lib/auth/selectDesktopAuthProvider";
import { createHmac, timingSafeEqual } from "crypto";

const TOKEN_VERSION = "fwdesktop_v1";
const SUPABASE_TOKEN_VERSION = "fwdesktop_supabase_v1";
const DEFAULT_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type DesktopTokenPayload = {
  version: typeof TOKEN_VERSION | typeof SUPABASE_TOKEN_VERSION;
  userId: string;
  supabaseUserId?: string;
  issuedAt: number;
  expiresAt: number;
};

function getDesktopTokenSecret() {
  const secret =
    process.env.AUDIOFLUME_DESKTOP_TOKEN_SECRET ??
    process.env.FILMWAVE_DESKTOP_TOKEN_SECRET;

  if (secret) return secret;

  if (process.env.NODE_ENV !== "production") {
    return "filmwave-desktop-dev-secret";
  }

  throw new Error("Missing AUDIOFLUME_DESKTOP_TOKEN_SECRET");
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payloadSegment: string) {
  return createHmac("sha256", getDesktopTokenSecret())
    .update(payloadSegment)
    .digest("base64url");
}

function signaturesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) return false;

  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function createDesktopToken(userId: string, supabaseUserId?: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + DEFAULT_TOKEN_TTL_SECONDS;
  const isSupabase = selectDesktopAuthProvider(
    process.env.AUDIOFLUME_DESKTOP_AUTH_PROVIDER,
    process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER,
  ) === "supabase";
  if (isSupabase && (!supabaseUserId || !UUID_PATTERN.test(supabaseUserId))) {
    throw new Error("Verified Supabase subject required for desktop token");
  }
  const payload: DesktopTokenPayload = {
    version: selectDesktopAuthProvider(
      process.env.AUDIOFLUME_DESKTOP_AUTH_PROVIDER,
      process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER,
    ) === "supabase" ? SUPABASE_TOKEN_VERSION : TOKEN_VERSION,
    userId,
    ...(isSupabase ? { supabaseUserId } : {}),
    issuedAt,
    expiresAt,
  };
  const payloadSegment = base64UrlEncode(JSON.stringify(payload));
  const signatureSegment = signPayload(payloadSegment);

  return `${payloadSegment}.${signatureSegment}`;
}

export function verifyDesktopToken(token: string | null | undefined) {
  if (!token) return null;

  const [payloadSegment, signatureSegment] = token.split(".");

  if (!payloadSegment || !signatureSegment) return null;

  const expectedSignature = signPayload(payloadSegment);

  if (!signaturesMatch(signatureSegment, expectedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(payloadSegment)) as DesktopTokenPayload;
    const now = Math.floor(Date.now() / 1000);

    // Tokens are bound to the active desktop provider. An old Clerk-signed
    // desktop token cannot silently authorize a Supabase cutover session.
    const expectedVersion = selectDesktopAuthProvider(
      process.env.AUDIOFLUME_DESKTOP_AUTH_PROVIDER,
      process.env.AUDIOFLUME_ACCOUNT_AUTH_PROVIDER,
    ) === "supabase" ? SUPABASE_TOKEN_VERSION : TOKEN_VERSION;
    if (payload.version !== expectedVersion) return null;
    if (!payload.userId) return null;
    if (expectedVersion === SUPABASE_TOKEN_VERSION &&
      (typeof payload.supabaseUserId !== "string" || !UUID_PATTERN.test(payload.supabaseUserId))) return null;
    if (!Number.isFinite(payload.expiresAt) || payload.expiresAt <= now) return null;

    return payload;
  } catch {
    return null;
  }
}

export function getBearerTokenFromRequest(req: Request) {
  const header = req.headers.get("authorization") || "";
  const [scheme, token] = header.split(" ");

  if (scheme?.toLowerCase() !== "bearer") return null;

  return token || null;
}

export function getDesktopUserIdFromRequest(req: Request) {
  const token = getBearerTokenFromRequest(req);
  const payload = verifyDesktopToken(token);

  return payload?.userId ?? null;
}
