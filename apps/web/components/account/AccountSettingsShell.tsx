"use client";

import Link from "next/link";
import Footer from "@/components/Footer";
import BackendPageHeader from "@/components/backend/BackendPageHeader";
import { usePlayer } from "@/context/PlayerContext";
import AccountSidebar from "./AccountSidebar";
import { AccountHero } from "./AccountUI";
import { heroConfig, navItems } from "./accountData";
import type { AccountSection } from "./accountTypes";
import MembershipSection from "./sections/MembershipSection";
import PaymentSection from "./sections/PaymentSection";
import ProfileSection from "./sections/ProfileSection";
import SecuritySection from "./sections/SecuritySection";
import SettingsSection from "./sections/SettingsSection";
import SupportSection from "./sections/SupportSection";

type AccountSettingsShellProps = {
  section: AccountSection;
};

function AccountContent({ section }: { section: AccountSection }) {
  if (section === "profile") return <ProfileSection />;
  if (section === "settings") return <SettingsSection />;
  if (section === "membership") return <MembershipSection />;
  if (section === "payment") return <PaymentSection />;
  if (section === "security") return <SecuritySection />;
  return <SupportSection />;
}

export default function AccountSettingsShell({ section }: AccountSettingsShellProps) {
  const { currentSong } = usePlayer();
  const activeNav = navItems.find((item) => item.section === section);
  const currentHero = heroConfig[section];

  return (
    <main className="filmwave-account-content-page min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
      <AccountSidebar />

      <section className="min-h-screen bg-[var(--filmwave-admin-canvas)] px-5 pb-0 pt-[88px] md:px-8 xl:px-10">
        <div className="mx-auto flex min-h-full max-w-[1180px] flex-col">
          <BackendPageHeader
            section="Account"
            label={activeNav?.label || "Account"}
            action={
              <Link
                href="/music"
                className="filmwave-backend-button filmwave-backend-button-secondary filmwave-backend-button-compact"
              >
                Back to Music
              </Link>
            }
          />

          <AccountHero config={currentHero} />
          <AccountContent section={section} />

          <div
            className="mt-auto pt-16"
            style={{ paddingBottom: currentSong ? "72px" : "8px" }}
          >
            <Footer
              className="!px-0"
              playerPadding={false}
              showTopBorder={false}
              pageGutter={false}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
