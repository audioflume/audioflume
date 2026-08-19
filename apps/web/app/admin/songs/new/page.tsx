import AdminSongForm from '@/components/admin/AdminSongForm'
import AdminSongAiGeneratedFieldInjector from '@/components/admin/AdminSongAiGeneratedFieldInjector'
import AdminSongFormEditPointsLinkInjector from '@/components/admin/AdminSongFormEditPointsLinkInjector'
import AdminSongRegionFieldInjector from '@/components/admin/AdminSongRegionFieldInjector'

export default function NewSongPage() {
  return (
    <>
      <AdminSongForm mode="create" />
      <AdminSongAiGeneratedFieldInjector />
      <AdminSongRegionFieldInjector />
      <AdminSongFormEditPointsLinkInjector />
    </>
  )
}
