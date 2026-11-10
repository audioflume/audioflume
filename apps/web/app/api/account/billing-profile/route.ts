import { resolveAccountIdentity } from "@/lib/auth/resolveAccountIdentity";
import { NextResponse } from "next/server";
import { cleanOptionalString, ensureBillingProfile } from "@/lib/account";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const identity = await resolveAccountIdentity();
  const { userId, user } = identity;
  if (!userId) return NextResponse.json({ error: identity.error }, { status: identity.status });

  try {
    const billingProfile = await ensureBillingProfile(userId, user);
    return NextResponse.json({ billingProfile });
  } catch (error) {
    console.error("Failed to load billing profile:", error);
    return NextResponse.json({ error: "Failed to load billing profile" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const identity = await resolveAccountIdentity();
  const { userId, user } = identity;
  if (!userId) return NextResponse.json({ error: identity.error }, { status: identity.status });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const billingEmail = cleanOptionalString(payload.billing_email, 180);

  if (billingEmail && !billingEmail.includes("@")) {
    return NextResponse.json({ error: "Billing email must be a valid email address" }, { status: 400 });
  }

  try {
    await ensureBillingProfile(userId, user);
    const { data, error } = await supabaseServer
      .from("user_billing_profiles")
      .upsert(
        {
          clerk_user_id: userId,
          billing_email: billingEmail,
          business_name: cleanOptionalString(payload.business_name, 160),
          tax_id: cleanOptionalString(payload.tax_id, 80),
          country: cleanOptionalString(payload.country, 80),
          province_state: cleanOptionalString(payload.province_state, 80),
        },
        { onConflict: "clerk_user_id" },
      )
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ billingProfile: data });
  } catch (error) {
    console.error("Failed to update billing profile:", error);
    return NextResponse.json({ error: "Failed to update billing profile" }, { status: 500 });
  }
}
