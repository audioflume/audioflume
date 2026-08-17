import AdminSongAiGeneratedFieldInjector from '@/components/admin/AdminSongAiGeneratedFieldInjector'
import AdminSongEditUploadStateAdapter from '@/components/admin/AdminSongEditUploadStateAdapter'
import AdminSongForm from '@/components/admin/AdminSongForm'
import AdminSongFormEditPointsLinkInjector from '@/components/admin/AdminSongFormEditPointsLinkInjector'
import AdminSongRegionFieldInjector from '@/components/admin/AdminSongRegionFieldInjector'
import AdminSongUploadPresentationInjector from '@/components/admin/AdminSongUploadPresentationInjector'

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <>
      <AdminSongForm mode="edit" songId={id} />
      <AdminSongEditUploadStateAdapter />
      <AdminSongUploadPresentationInjector />
      <AdminSongAiGeneratedFieldInjector songId={id} />
      <AdminSongRegionFieldInjector songId={id} />
      <AdminSongFormEditPointsLinkInjector songId={id} />
    </>
  )
}
