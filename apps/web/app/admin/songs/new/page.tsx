import AdminSongForm from '@/components/admin/AdminSongForm'
import AdminSongAiGeneratedFieldInjector from '@/components/admin/AdminSongAiGeneratedFieldInjector'
import AdminSongFormEditPointsLinkInjector from '@/components/admin/AdminSongFormEditPointsLinkInjector'
import AdminSongRegionFieldInjector from '@/components/admin/AdminSongRegionFieldInjector'
import AdminSongUploadPresentationInjector from '@/components/admin/AdminSongUploadPresentationInjector'
import AdminSongUploadResetSync from '@/components/admin/AdminSongUploadResetSync'

export default function NewSongPage() {
  return (
    <>
      <AdminSongForm mode="create" />
      <AdminSongUploadPresentationInjector />
      <AdminSongUploadResetSync />
      <AdminSongAiGeneratedFieldInjector />
      <AdminSongRegionFieldInjector />
      <AdminSongFormEditPointsLinkInjector />
    </>
  )
}
