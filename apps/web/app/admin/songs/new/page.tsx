import AdminSongForm from '@/components/admin/AdminSongForm'
import AdminSongFormEditPointsLinkInjector from '@/components/admin/AdminSongFormEditPointsLinkInjector'
import AdminSongRegionFieldInjector from '@/components/admin/AdminSongRegionFieldInjector'

export default function NewSongPage() {
  return (
    <>
      <AdminSongForm mode="create" />
      <AdminSongRegionFieldInjector />
      <AdminSongFormEditPointsLinkInjector />
    </>
  )
}
