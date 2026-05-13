import AdminSongForm from '@/components/admin/AdminSongForm'

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return <AdminSongForm mode="edit" songId={id} />
}