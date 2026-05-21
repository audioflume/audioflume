import { supabaseServer } from "@/lib/supabaseServer";

export type MembershipPlanKey = "free" | "starter" | "studio" | "enterprise" | "lifetime";
export type MembershipStatus = "inactive" | "active" | "trialing" | "past_due" | "canceled" | "lifetime";

type ClerkAccountUser = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
  username?: string | null;
  imageUrl?: string | null;
  primaryEmailAddress?: {
    emailAddress?: string | null;
  } | null;
} | null;

export type UserProfile = {
  clerk_user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  company_name: string | null;
  primary_use: string | null;
  avatar_url: string | null;
  created_at?: string;
  updated_at?: string;
};

export type UserBillingProfile = {
  clerk_user_id: string;
  billing_email: string | null;
  business_name: string | null;
  tax_id: string | null;
  country: string | null;
  province_state: string | null;
  stripe_customer_id: string | null;
  created_at?: string;
  updated_at?: string;
};

export type UserMembership = {
  clerk_user_id: string;
  plan_key: MembershipPlanKey;
  status: MembershipStatus;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  license_label: string;
  download_limit: number | null;
  downloads_used: number;
  created_at?: string;
  updated_at?: string;
};

export function cleanOptionalString(value: unknown, maxLength = 160) {
  if (typeof value !== "string") return null;

  const cleaned = value.trim();
  if (!cleaned) return null;

  return cleaned.slice(0, maxLength);
}

export function getPrimaryEmail(user: ClerkAccountUser) {
  return user?.primaryEmailAddress?.emailAddress ?? null;
}

export function getProfileSeed(userId: string, user: ClerkAccountUser) {
  const firstName = cleanOptionalString(user?.firstName, 80);
  const lastName = cleanOptionalString(user?.lastName, 80);
  const fullName = cleanOptionalString(user?.fullName, 160);
  const username = cleanOptionalString(user?.username, 80);

  return {
    clerk_user_id: userId,
    first_name: firstName,
    last_name: lastName,
    display_name: fullName ?? username ?? "Filmwave Member",
    company_name: null,
    primary_use: null,
    avatar_url: cleanOptionalString(user?.imageUrl, 500),
  } satisfies UserProfile;
}

export async function ensureUserProfile(userId: string, user: ClerkAccountUser) {
  const { data, error } = await supabaseServer
    .from("user_profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as UserProfile;

  const seed = getProfileSeed(userId, user);

  const { data: created, error: createError } = await supabaseServer
    .from("user_profiles")
    .insert(seed)
    .select("*")
    .single();

  if (createError) throw createError;
  return created as UserProfile;
}

export async function ensureBillingProfile(userId: string, user: ClerkAccountUser) {
  await ensureUserProfile(userId, user);

  const { data, error } = await supabaseServer
    .from("user_billing_profiles")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as UserBillingProfile;

  const { data: created, error: createError } = await supabaseServer
    .from("user_billing_profiles")
    .insert({
      clerk_user_id: userId,
      billing_email: getPrimaryEmail(user),
      business_name: null,
      tax_id: null,
      country: null,
      province_state: null,
      stripe_customer_id: null,
    })
    .select("*")
    .single();

  if (createError) throw createError;
  return created as UserBillingProfile;
}

export async function ensureMembership(userId: string, user: ClerkAccountUser) {
  await ensureUserProfile(userId, user);

  const { data, error } = await supabaseServer
    .from("user_memberships")
    .select("*")
    .eq("clerk_user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data as UserMembership;

  const { data: created, error: createError } = await supabaseServer
    .from("user_memberships")
    .insert({
      clerk_user_id: userId,
      plan_key: "lifetime",
      status: "lifetime",
      stripe_subscription_id: null,
      stripe_price_id: null,
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
      license_label: "Royalty-free commercial use",
      download_limit: null,
      downloads_used: 0,
    })
    .select("*")
    .single();

  if (createError) throw createError;
  return created as UserMembership;
}

export function formatPlanLabel(planKey: MembershipPlanKey) {
  const labels: Record<MembershipPlanKey, string> = {
    free: "Free",
    starter: "Starter",
    studio: "Studio",
    enterprise: "Enterprise",
    lifetime: "Lifetime Membership",
  };

  return labels[planKey] ?? "Membership";
}

export function formatMembershipStatus(status: MembershipStatus) {
  const labels: Record<MembershipStatus, string> = {
    inactive: "Inactive",
    active: "Active",
    trialing: "Trialing",
    past_due: "Past due",
    canceled: "Canceled",
    lifetime: "Active",
  };

  return labels[status] ?? "Unknown";
}
