"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import SidebarBodyClassSync from "@/components/SidebarBodyClassSync";
import SidebarCuratedLinkMount from "@/components/SidebarCuratedLinkMount";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function SidebarRenderer({
  initialCollapsed,
}: {
  initialCollapsed: boolean;
}) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");

  if (isAdminPage) return <AdminSidebar />;

  return (
    <>
      <Sidebar initialCollapsed={initialCollapsed} />
      <SidebarBodyClassSync />
      <SidebarCuratedLinkMount />
    </>
  );
}
