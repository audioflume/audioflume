import AdminSongForm from '@/components/admin/AdminSongForm'
import AdminSongFormEditPointsLinkInjector from '@/components/admin/AdminSongFormEditPointsLinkInjector'

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <>
      <AdminSongForm mode="edit" songId={id} />
      <AdminSongFormEditPointsLinkInjector songId={id} />
    </>
  )
}
