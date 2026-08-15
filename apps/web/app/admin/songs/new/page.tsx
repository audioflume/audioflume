import AdminSongForm from '@/components/admin/AdminSongForm'
import AdminSongAiGeneratedFieldInjector from '@/components/admin/AdminSongAiGeneratedFieldInjector'
import AdminSongFormEditPointsLinkInjector from '@/components/admin/AdminSongFormEditPointsLinkInjector'
import AdminSongRegionFieldInjector from '@/components/admin/AdminSongRegionFieldInjector'
import AdminSongUploadPresentationInjector from '@/components/admin/AdminSongUploadPresentationInjector'

export default function NewSongPage() {
  return (
    <>
      <AdminSongForm mode="create" />
      <AdminSongUploadPresentationInjector />
      <AdminSongAiGeneratedFieldInjector />
      <AdminSongRegionFieldInjector />
      <AdminSongFormEditPointsLinkInjector />
    </>
  )
}
