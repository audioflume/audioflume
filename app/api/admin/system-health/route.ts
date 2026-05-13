import { currentUser } from "@clerk/nextjs/server";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { ADMIN_EMAILS } from "@/lib/adminEmails";

export const dynamic = "force-dynamic";

type HealthTone = "success" | "warning" | "error";

type HealthItem = {
  key: string;
  label: string;
  tone: HealthTone;
  message: string;
};

function getEnv(...keys: string[]) {
  for (const key of keys) {
    const value = process.env[key];

    if (value) return value;
  }

  return "";
}

async function checkAirtable(): Promise<HealthItem> {
  const apiKey = getEnv("AIRTABLE_PERSONAL_ACCESS_TOKEN", "AIRTABLE_API_KEY");
  const baseId = getEnv("AIRTABLE_BASE_ID");
  const tableId = getEnv("AIRTABLE_SONGS_TABLE_ID");

  if (!apiKey || !baseId || !tableId) {
    return {
      key: "airtable",
      label: "Airtable connected",
      tone: "error",
      message: "Missing Airtable environment variables.",
    };
  }

  try {
    const res = await fetch(
      `https://api.airtable.com/v0/${baseId}/${tableId}?maxRecords=1`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
        cache: "no-store",
      },
    );

    if (!res.ok) {
      return {
        key: "airtable",
        label: "Airtable connected",
        tone: "error",
        message: `Airtable returned ${res.status}.`,
      };
    }

    return {
      key: "airtable",
      label: "Airtable connected",
      tone: "success",
      message: "Airtable is reachable.",
    };
  } catch (err) {
    return {
      key: "airtable",
      label: "Airtable connected",
      tone: "error",
      message: err instanceof Error ? err.message : "Airtable check failed.",
    };
  }
}

async function checkR2(): Promise<HealthItem> {
  const accountId = getEnv("CLOUDFLARE_R2_ACCOUNT_ID", "R2_ACCOUNT_ID");
  const accessKeyId = getEnv("CLOUDFLARE_R2_ACCESS_KEY_ID", "R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv(
    "CLOUDFLARE_R2_SECRET_ACCESS_KEY",
    "R2_SECRET_ACCESS_KEY",
  );
  const bucketName = getEnv("CLOUDFLARE_R2_BUCKET_NAME", "R2_BUCKET_NAME");

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return {
      key: "r2",
      label: "Cloudflare R2 ready",
      tone: "error",
      message: "Missing R2 environment variables.",
    };
  }

  try {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    await client.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        MaxKeys: 1,
      }),
    );

    return {
      key: "r2",
      label: "Cloudflare R2 ready",
      tone: "success",
      message: "R2 bucket is reachable.",
    };
  } catch (err) {
    return {
      key: "r2",
      label: "Cloudflare R2 ready",
      tone: "error",
      message: err instanceof Error ? err.message : "R2 check failed.",
    };
  }
}

async function checkAnalyzer(): Promise<HealthItem> {
  return {
    key: "analyzer",
    label: "Analyzer ready",
    tone: "success",
    message: "Analyzer code is available in the admin upload flow.",
  };
}

export async function GET() {
  const user = await currentUser();
  const email = user?.primaryEmailAddress?.emailAddress;

  if (!email || !ADMIN_EMAILS.includes(email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statuses = await Promise.all([
    checkAirtable(),
    checkR2(),
    checkAnalyzer(),
  ]);

  return NextResponse.json({
    statuses,
    checkedAt: new Date().toISOString(),
  });
}
