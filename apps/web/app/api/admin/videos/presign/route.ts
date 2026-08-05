import { createHash, createHmac } from "node:crypto";
import {
  GetBucketCorsCommand,
  PutBucketCorsCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";

const DEFAULT_VIDEO_BUCKET = "video";
const DEFAULT_VIDEO_PUBLIC_URL =
  "https://pub-cd585d75522a44bb9dad78b6f9974d03.r2.dev";
const MAX_VIDEO_SIZE_BYTES = 250 * 1024 * 1024;
const PRESIGN_EXPIRES_SECONDS = 15 * 60;

const VIDEO_EXTENSION_BY_TYPE = new Map([
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
]);

type CorsRule = {
  AllowedHeaders?: string[];
  AllowedMethods?: string[];
  AllowedOrigins?: string[];
  ExposeHeaders?: string[];
  MaxAgeSeconds?: number;
};

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled"
  );
}

function encodeRfc3986(value: string) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (character) =>
    `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function encodeObjectPath(value: string) {
  return value.split("/").map(encodeRfc3986).join("/");
}

function sha256(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string) {
  return createHmac("sha256", key).update(value, "utf8").digest();
}

function getSigningKey(secretAccessKey: string, dateStamp: string) {
  const dateKey = hmac(`AWS4${secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, "auto");
  const serviceKey = hmac(regionKey, "s3");

  return hmac(serviceKey, "aws4_request");
}

function createPresignedPutUrl({
  accountId,
  accessKeyId,
  secretAccessKey,
  bucket,
  key,
  contentType,
}: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  key: string;
  contentType: string;
}) {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`;
  const host = `${bucket}.${accountId}.r2.cloudflarestorage.com`;
  const canonicalUri = `/${encodeObjectPath(key)}`;
  const signedHeaders = "content-type;host";
  const canonicalHeaders = `content-type:${contentType}\nhost:${host}\n`;

  const queryEntries = [
    ["X-Amz-Algorithm", "AWS4-HMAC-SHA256"],
    ["X-Amz-Content-Sha256", "UNSIGNED-PAYLOAD"],
    ["X-Amz-Credential", `${accessKeyId}/${credentialScope}`],
    ["X-Amz-Date", amzDate],
    ["X-Amz-Expires", String(PRESIGN_EXPIRES_SECONDS)],
    ["X-Amz-SignedHeaders", signedHeaders],
  ] as const;

  const canonicalQuery = queryEntries
    .map(([name, value]) => `${encodeRfc3986(name)}=${encodeRfc3986(value)}`)
    .sort()
    .join("&");

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");

  const signature = createHmac(
    "sha256",
    getSigningKey(secretAccessKey, dateStamp),
  )
    .update(stringToSign, "utf8")
    .digest("hex");

  return `https://${host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

function buildPublicUrl(publicUrl: string, key: string) {
  return `${publicUrl.replace(/\/$/, "")}/${encodeObjectPath(key)}`;
}

function getRequestOrigin(req: Request) {
  const origin = req.headers.get("origin");

  if (!origin) return "";

  try {
    const parsed = new URL(origin);

    if (!['http:', 'https:'].includes(parsed.protocol)) return "";

    return parsed.origin;
  } catch {
    return "";
  }
}

function getErrorText(error: unknown) {
  if (error instanceof Error) return `${error.name} ${error.message}`;
  if (!error || typeof error !== "object") return "";

  const record = error as Record<string, unknown>;

  return [record.name, record.Code, record.code, record.message]
    .filter((value): value is string => typeof value === "string")
    .join(" ");
}

function isMissingCorsConfiguration(error: unknown) {
  const message = getErrorText(error).toLowerCase();

  return (
    message.includes("nosuchcorsconfiguration") ||
    message.includes("cors configuration does not exist")
  );
}

function corsRuleAllowsUpload(rule: CorsRule, origin: string) {
  const origins = rule.AllowedOrigins ?? [];
  const methods = rule.AllowedMethods ?? [];
  const headers = (rule.AllowedHeaders ?? []).map((header) =>
    header.toLowerCase(),
  );

  return (
    (origins.includes(origin) || origins.includes("*")) &&
    methods.includes("PUT") &&
    (headers.includes("content-type") || headers.includes("*"))
  );
}

async function ensureVideoBucketCors({
  accountId,
  accessKeyId,
  secretAccessKey,
  bucket,
  origin,
}: {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  origin: string;
}) {
  if (!origin) return;

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
  });

  let rules: CorsRule[] = [];

  try {
    const current = await client.send(
      new GetBucketCorsCommand({ Bucket: bucket }),
    );
    rules = current.CORSRules ?? [];
  } catch (error) {
    if (!isMissingCorsConfiguration(error)) throw error;
  }

  if (rules.some((rule) => corsRuleAllowsUpload(rule, origin))) return;

  await client.send(
    new PutBucketCorsCommand({
      Bucket: bucket,
      CORSConfiguration: {
        CORSRules: [
          ...rules,
          {
            AllowedOrigins: [origin],
            AllowedMethods: ["PUT"],
            AllowedHeaders: ["Content-Type"],
            ExposeHeaders: ["ETag"],
            MaxAgeSeconds: 3600,
          },
        ],
      },
    }),
  );
}

export async function POST(req: Request) {
  const admin = await requireAdmin();

  if (!admin.isAdmin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const fileName = String(body.fileName || "").trim();
    const fileType = String(body.fileType || "").trim().toLowerCase();
    const fileSize = Number(body.fileSize || 0);
    const slug = String(body.slug || "untitled");
    const extension = VIDEO_EXTENSION_BY_TYPE.get(fileType);

    if (!fileName || !extension) {
      return NextResponse.json(
        { error: "Choose an MP4, WebM, or MOV video" },
        { status: 400 },
      );
    }

    if (!Number.isFinite(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: "Invalid video size" }, { status: 400 });
    }

    if (fileSize > MAX_VIDEO_SIZE_BYTES) {
      return NextResponse.json(
        { error: "Video is too large (max 250 MB)" },
        { status: 400 },
      );
    }

    const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
    const bucket =
      process.env.CLOUDFLARE_R2_VIDEO_BUCKET_NAME || DEFAULT_VIDEO_BUCKET;
    const publicUrl =
      process.env.CLOUDFLARE_R2_VIDEO_PUBLIC_URL || DEFAULT_VIDEO_PUBLIC_URL;

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error("Missing Cloudflare R2 credentials");
    }

    const origin = getRequestOrigin(req);
    let corsWarning = "";

    try {
      await ensureVideoBucketCors({
        accountId,
        accessKeyId,
        secretAccessKey,
        bucket,
        origin,
      });
    } catch (corsError) {
      console.error("Video bucket CORS check failed:", corsError);
      corsWarning = origin
        ? `The video bucket must allow PUT requests from ${origin}. The current R2 credentials could not update that CORS rule automatically.`
        : "The video bucket CORS policy could not be verified.";
    }

    const safeSlug = slugify(slug);
    const videoKey = `playlist covers/${safeSlug}/cover-${Date.now()}.${extension}`;
    const uploadUrl = createPresignedPutUrl({
      accountId,
      accessKeyId,
      secretAccessKey,
      bucket,
      key: videoKey,
      contentType: fileType,
    });

    return NextResponse.json({
      uploadUrl,
      videoKey,
      videoUrl: buildPublicUrl(publicUrl, videoKey),
      contentType: fileType,
      expiresIn: PRESIGN_EXPIRES_SECONDS,
      allowedOrigin: origin,
      corsWarning,
    });
  } catch (error) {
    console.error("Video presign failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to prepare upload",
      },
      { status: 500 },
    );
  }
}
