import type { AccountSection, HeroConfig } from "./accountTypes";

export const navItems: {
  href: string;
  section: AccountSection;
  label: string;
  helper: string;
}[] = [
  { href: "/account/profile", section: "profile", label: "Profile", helper: "Personal info" },
  { href: "/account/settings", section: "settings", label: "Settings", helper: "App preferences" },
  { href: "/account/membership", section: "membership", label: "Membership", helper: "Plan and license" },
  { href: "/account/payment", section: "payment", label: "Payment", helper: "Billing method" },
  { href: "/account/security", section: "security", label: "Security", helper: "Access controls" },
  { href: "/account/support", section: "support", label: "Support & FAQ", helper: "Help center" },
];

export const heroConfig: Record<AccountSection, HeroConfig> = {
  profile: {
    eyebrow: "Account",
    title: "Your Filmwave profile.",
    description: "Keep your account details, studio info, and creative use case aligned with the music library you build around.",
    image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=80",
    statA: "Creator profile",
    statB: "Library access",
    statC: "Personal details",
  },
  settings: {
    eyebrow: "Preferences",
    title: "Shape how Filmwave behaves.",
    description: "Adjust the global settings that control your browsing layout, theme, playlist order, and sidebar project workflow.",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
    statA: "Synced prefs",
    statB: "Playlist layout",
    statC: "Project order",
  },
  membership: {
    eyebrow: "Membership",
    title: "Plan, license, and usage.",
    description: "A clearer account home for membership status, usage signals, plan changes, and subscription controls.",
    image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=80",
    statA: "Commercial use",
    statB: "Unlimited access",
    statC: "Plan controls",
  },
  payment: {
    eyebrow: "Billing",
    title: "Payment details without the clutter.",
    description: "Manage invoice details and billing contact information from a compact billing workspace.",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80",
    statA: "Invoices",
    statB: "Payment method",
    statC: "Billing contact",
  },
  security: {
    eyebrow: "Access",
    title: "Keep the account protected.",
    description: "Review sign-in controls, recovery details, and account access settings for your Filmwave workspace.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
    statA: "Verified email",
    statB: "Clerk security",
    statC: "Recovery ready",
  },
  support: {
    eyebrow: "Help",
    title: "Support for the cut.",
    description: "Find help for account questions, licensing, billing, missing files, and support requests in one place.",
    image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80",
    statA: "Support tickets",
    statB: "License help",
    statC: "FAQ",
  },
};

export const supportImages = [
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80",
];

export const membershipPlanImages = [
  "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80",
];
