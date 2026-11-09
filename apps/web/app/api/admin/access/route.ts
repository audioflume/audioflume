import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only authorization signal for the staged client admin dashboard.
 * Never expose identity-link mappings or private administrative metadata.
 */
export async function GET() {
  const admin = await requireAdmin();
  return NextResponse.json(
    { isAdmin: admin.isAdmin },
    {
      status: admin.isAdmin ? 200 : 403,
      headers: { "Cache-Control": "private, no-store" },
    },
  );
}
