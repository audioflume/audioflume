import { resolveAccountIdentity } from "@/lib/auth/resolveAccountIdentity";
import { NextResponse } from "next/server";
import { ensureMembership, formatMembershipStatus, formatPlanLabel } from "@/lib/account";

export async function GET() {
  const identity = await resolveAccountIdentity();
  const { userId, user } = identity;
  if (!userId) return NextResponse.json({ error: identity.error }, { status: identity.status });

  try {
    const membership = await ensureMembership(userId, user);
    return NextResponse.json({
      membership,
      display: {
        plan_label: formatPlanLabel(membership.plan_key),
        status_label: formatMembershipStatus(membership.status),
        renewal_label: membership.current_period_end
          ? new Intl.DateTimeFormat("en-CA", { month: "short", day: "numeric", year: "numeric" }).format(new Date(membership.current_period_end))
          : membership.status === "lifetime"
            ? "No renewal"
            : "Not scheduled",
        downloads_label: membership.download_limit == null ? "Unlimited" : `${membership.downloads_used}/${membership.download_limit}`,
      },
    });
  } catch (error) {
    console.error("Failed to load membership:", error);
    return NextResponse.json({ error: "Failed to load membership" }, { status: 500 });
  }
}
