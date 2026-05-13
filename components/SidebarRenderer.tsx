'use client'

import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import AdminSidebar from '@/components/admin/AdminSidebar'

export default function SidebarRenderer() {
  const pathname = usePathname()
  const isAdminPage = pathname.startsWith('/admin')

  return isAdminPage ? <AdminSidebar /> : <Sidebar />
}