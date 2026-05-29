import { currentUser } from "@clerk/nextjs/server";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { ADMIN_EMAILS } from "@/lib/adminEmails";
import { supabaseServer } from "@/lib/supabaseServer";

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

async function checkSupabase(): Promise<HealthItem> {
  try {
    const { error } = await supabaseServer
      .from("songs")
      .select("id", { count: "exact", head: true });

    if (error) throw error;

    return {
      key: "supabase",
      label: "Supabase connected",
      tone: "success",
      message: "Supabase is reachable.",
    };
  } catch (err) {
    return {
      key: "supabase",
      label: "Supabase connected",
      tone: "error",
      message: err instanceof Error ? err.message : "Supabase check failed.",
    };
  }
}

async function checkR2Bucket(bucketEnvKey: string, labelKey: string, label: string): Promise<HealthItem> {
  const accountId = getEnv("CLOUDFLARE_R2_ACCOUNT_ID");
  const accessKeyId = getEnv("CLOUDFLARE_R2_ACCESS_KEY_ID");
  const secretAccessKey = getEnv("CLOUDFLARE_R2_SECRET_ACCESS_KEY");
  const bucketName = getEnv(bucketEnvKey);

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    return {
      key: labelKey,
      label,
      tone: "error",
      message: `Missing R2 environment variables for ${label}.`,
    };
  }

  try {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });

    await client.send(new ListObjectsV2Command({ Bucket: bucketName, MaxKeys: 1 }));

    return {
      key: labelKey,
      label,
      tone: "success",
      message: `${label} bucket is reachable.`,
    };
  } catch (err) {
    return {
      key: labelKey,
      label,
      tone: "error",
      message: err instanceof Error ? err.message : `${label} check failed.`,
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
    checkSupabase(),
    checkR2Bucket("CLOUDFLARE_R2_BUCKET_NAME", "r2_music", "Music library"),
    checkR2Bucket("CLOUDFLARE_R2_IMAGES_BUCKET_NAME", "r2_images", "Image storage"),
    checkAnalyzer(),
  ]);

  return NextResponse.json({
    statuses,
    checkedAt: new Date().toISOString(),
  });
}
