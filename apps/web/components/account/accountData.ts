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
    title: "Profile",
    description: "Manage the personal details and studio information attached to your Audioflume account.",
    image: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=80",
    statA: "Creator profile",
    statB: "Library access",
    statC: "Personal details",
  },
  settings: {
    eyebrow: "Account",
    title: "Settings",
    description: "Choose how Audioflume behaves across browsing, playlists, projects, and appearance.",
    image: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80",
    statA: "Synced prefs",
    statB: "Playlist layout",
    statC: "Project order",
  },
  membership: {
    eyebrow: "Account",
    title: "Membership",
    description: "Review your plan, licensing coverage, usage, and subscription controls.",
    image: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=80",
    statA: "Commercial use",
    statB: "Unlimited access",
    statC: "Plan controls",
  },
  payment: {
    eyebrow: "Account",
    title: "Payment",
    description: "Manage billing contact details, payment information, and invoices.",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80",
    statA: "Invoices",
    statB: "Payment method",
    statC: "Billing contact",
  },
  security: {
    eyebrow: "Account",
    title: "Security",
    description: "Review sign-in, recovery, and account access settings.",
    image: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80",
    statA: "Verified email",
    statB: "Clerk security",
    statC: "Recovery ready",
  },
  support: {
    eyebrow: "Account",
    title: "Support & FAQ",
    description: "Find answers to common questions or get help with licensing, billing, and account issues.",
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
