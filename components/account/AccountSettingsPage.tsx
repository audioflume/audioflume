"use client"

import AccountSettingsShell from "./AccountSettingsShell"
import type { AccountSection } from "./accountTypes"

type AccountSettingsPageProps = {
  section: AccountSection
}

export default function AccountSettingsPage({ section }: AccountSettingsPageProps) {
  return <AccountSettingsShell section={section} />
}
