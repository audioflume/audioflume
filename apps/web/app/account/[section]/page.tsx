import { notFound } from "next/navigation";
import AccountSettingsPage from "@/components/account/AccountSettingsPage";

type AccountSection =
  | "profile"
  | "settings"
  | "membership"
  | "payment"
  | "security"
  | "support";

const validSections = new Set<AccountSection>([
  "profile",
  "settings",
  "membership",
  "payment",
  "security",
  "support",
]);

export default async function AccountSectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section } = await params;

  if (!validSections.has(section as AccountSection)) {
    notFound();
  }

  return <AccountSettingsPage section={section as AccountSection} />;
}
