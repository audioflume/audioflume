export type AccountSection = "profile" | "settings" | "membership" | "payment" | "security" | "support";

export type HeroConfig = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  statA: string;
  statB: string;
  statC: string;
};

export type LoadState = "idle" | "loading" | "ready" | "error";

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
  plan_key: string;
  status: string;
  current_period_end: string | null;
  license_label: string;
  download_limit: number | null;
  downloads_used: number;
};

export type MembershipDisplay = {
  plan_label: string;
  status_label: string;
  renewal_label: string;
  downloads_label: string;
};

export type UsageSnapshot = {
  playlists: number;
  projects: number;
  favorites: number;
  downloads: number;
};

export type SecurityEvent = {
  id: number;
  event_type: string;
  description: string | null;
  location_label: string | null;
  created_at: string;
};

export type ProfileFormState = {
  first_name: string;
  last_name: string;
  display_name: string;
  company_name: string;
  primary_use: string;
  avatar_url: string;
};

export type BillingFormState = {
  billing_email: string;
  business_name: string;
  tax_id: string;
  country: string;
  province_state: string;
};

export type AccountFeedbackMessage = {
  tone: "success" | "error";
  text: string;
};
