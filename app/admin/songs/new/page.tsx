import AdminSongForm from '@/components/admin/AdminSongForm'
import AdminSongFormEditPointsLinkInjector from '@/components/admin/AdminSongFormEditPointsLinkInjector'

export default function NewSongPage() {
  return (
    <>
      <AdminSongForm mode="create" />
      <AdminSongFormEditPointsLinkInjector />
    </>
  )
}
