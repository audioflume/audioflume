"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import SidebarBodyClassSync from "@/components/SidebarBodyClassSync";
import AdminSidebar from "@/components/admin/AdminSidebar";

function getStoredSidebarCollapsed(fallback: boolean) {
  try {
    const stored = window.localStorage.getItem("filmwave-sidebar-collapsed");
    if (stored === "true") return true;
    if (stored === "false") return false;
  } catch {
    return fallback;
  }

  return fallback;
}

export default function SidebarRenderer({
  initialCollapsed = false,
}: {
  initialCollapsed?: boolean;
}) {
  const pathname = usePathname();
  const isAdminPage = pathname.startsWith("/admin");
  const [resolvedInitialCollapsed, setResolvedInitialCollapsed] =
    useState(initialCollapsed);

  useEffect(() => {
    setResolvedInitialCollapsed(getStoredSidebarCollapsed(initialCollapsed));
  }, [initialCollapsed]);

  if (isAdminPage) return <AdminSidebar />;

  return (
    <>
      <Sidebar initialCollapsed={resolvedInitialCollapsed} />
      <SidebarBodyClassSync />
    </>
  );
}
