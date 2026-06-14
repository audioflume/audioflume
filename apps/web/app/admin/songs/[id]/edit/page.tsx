import AdminSongForm from '@/components/admin/AdminSongForm'
import AdminSongFormEditPointsLinkInjector from '@/components/admin/AdminSongFormEditPointsLinkInjector'
import AdminSongRegionFieldInjector from '@/components/admin/AdminSongRegionFieldInjector'

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <>
      <AdminSongForm mode="edit" songId={id} />
      <AdminSongRegionFieldInjector songId={id} />
      <AdminSongFormEditPointsLinkInjector songId={id} />
    </>
  )
}
