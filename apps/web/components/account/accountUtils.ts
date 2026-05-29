import type { BillingFormState, UserBillingProfile, UserProfile, ProfileFormState } from "./accountTypes";

export const emptyProfileForm: ProfileFormState = {
  first_name: "",
  last_name: "",
  display_name: "",
  company_name: "",
  primary_use: "",
  avatar_url: "",
};

export const emptyBillingForm: BillingFormState = {
  billing_email: "",
  business_name: "",
  tax_id: "",
  country: "",
  province_state: "",
};

export function toInputValue(value: string | null | undefined) {
  return value ?? "";
}

export function profileToForm(profile: UserProfile | null): ProfileFormState {
  return {
    first_name: toInputValue(profile?.first_name),
    last_name: toInputValue(profile?.last_name),
    display_name: toInputValue(profile?.display_name),
    company_name: toInputValue(profile?.company_name),
    primary_use: toInputValue(profile?.primary_use),
    avatar_url: toInputValue(profile?.avatar_url),
  };
}

export function billingToForm(billingProfile: UserBillingProfile | null): BillingFormState {
  return {
    billing_email: toInputValue(billingProfile?.billing_email),
    business_name: toInputValue(billingProfile?.business_name),
    tax_id: toInputValue(billingProfile?.tax_id),
    country: toInputValue(billingProfile?.country),
    province_state: toInputValue(billingProfile?.province_state),
  };
}

export function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function formatCount(value: number, label: string) {
  return `${value} ${label}${value === 1 ? "" : "s"}`;
}
