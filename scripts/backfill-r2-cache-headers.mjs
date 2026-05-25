import {
  CopyObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from "@aws-sdk/client-s3";

const accountId = process.env.CLOUDFLARE_R2_ACCOUNT_ID;
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME;

const cacheControl = "public, max-age=31536000, immutable";
const dryRun = process.argv.includes("--dry-run");
const prefixArg = process.argv.find((arg) => arg.startsWith("--prefix="));
const prefix = prefixArg ? prefixArg.replace("--prefix=", "") : undefined;

if (!accountId) throw new Error("Missing CLOUDFLARE_R2_ACCOUNT_ID");
if (!accessKeyId) throw new Error("Missing CLOUDFLARE_R2_ACCESS_KEY_ID");
if (!secretAccessKey) throw new Error("Missing CLOUDFLARE_R2_SECRET_ACCESS_KEY");
if (!bucketName) throw new Error("Missing CLOUDFLARE_R2_BUCKET_NAME");

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
  },
});

function isCacheableAsset(key) {
  return /\.(wav|mp3|m4a|aac|ogg|flac|webp|jpg|jpeg|png)$/i.test(key);
}

function inferContentType(key, fallback) {
  const lower = key.toLowerCase();

  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".aac")) return "audio/aac";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".flac")) return "audio/flac";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";

  return fallback || "application/octet-stream";
}

async function listObjectKeys() {
  const keys = [];
  let ContinuationToken;

  do {
    const res = await r2Client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
        ContinuationToken,
      }),
    );

    for (const object of res.Contents || []) {
      if (object.Key && isCacheableAsset(object.Key)) {
        keys.push(object.Key);
      }
    }

    ContinuationToken = res.NextContinuationToken;
  } while (ContinuationToken);

  return keys;
}

async function backfillObject(key) {
  const head = await r2Client.send(
    new HeadObjectCommand({
      Bucket: bucketName,
      Key: key,
    }),
  );

  if (head.CacheControl === cacheControl) {
    console.log(`skip ${key} — already has Cache-Control`);
    return "skipped";
  }

  const contentType = inferContentType(key, head.ContentType);

  if (dryRun) {
    console.log(`dry-run ${key} — ${head.CacheControl || "no Cache-Control"} -> ${cacheControl}`);
    return "dry-run";
  }

  await r2Client.send(
    new CopyObjectCommand({
      Bucket: bucketName,
      Key: key,
      CopySource: `${bucketName}/${encodeURIComponent(key).replace(/%2F/g, "/")}`,
      MetadataDirective: "REPLACE",
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );

  console.log(`updated ${key}`);
  return "updated";
}

const keys = await listObjectKeys();

console.log(
  `Found ${keys.length} cacheable R2 object${keys.length === 1 ? "" : "s"}${
    prefix ? ` under ${prefix}` : ""
  }.`,
);

let updated = 0;
let skipped = 0;
let dryRunCount = 0;
let failed = 0;

for (const key of keys) {
  try {
    const result = await backfillObject(key);

    if (result === "updated") updated += 1;
    if (result === "skipped") skipped += 1;
    if (result === "dry-run") dryRunCount += 1;
  } catch (err) {
    failed += 1;
    console.error(`failed ${key}`, err);
  }
}

console.log(
  `Done. updated=${updated} skipped=${skipped} dryRun=${dryRunCount} failed=${failed}`,
);

if (failed > 0) {
  process.exitCode = 1;
}
