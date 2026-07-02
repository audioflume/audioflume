import AdminSongForm from '@/components/admin/AdminSongForm'
import AdminSongAiGeneratedFieldInjector from '@/components/admin/AdminSongAiGeneratedFieldInjector'
import AdminSongFormEditPointsLinkInjector from '@/components/admin/AdminSongFormEditPointsLinkInjector'
import AdminSongRegionFieldInjector from '@/components/admin/AdminSongRegionFieldInjector'

export default async function EditSongPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <div className="admin-song-edit-page">
      <style>{`
        .admin-song-edit-page :where(
          [class~="rounded"],
          [class~="rounded-sm"],
          [class~="rounded-md"],
          [class~="rounded-lg"],
          [class~="rounded-xl"],
          [class~="rounded-2xl"],
          [class~="rounded-full"],
          [class~="rounded-[4px]"],
          [class~="rounded-[8px]"],
          [class~="rounded-[9px]"],
          [class~="rounded-[14px]"],
          [class~="rounded-[18px]"]
        ),
        .admin-song-edit-page .admin-song-form-card,
        .admin-song-edit-page .admin-song-form-icon-btn {
          border-radius: 0 !important;
        }

        .admin-song-edit-page .edit-point-play-button,
        .admin-song-edit-page button[aria-label="Toggle spacebar start from selected marker"],
        .admin-song-edit-page .cue-point-row-grid button[aria-label^="Play from"],
        .admin-song-edit-page .cue-point-marker-dot,
        .admin-song-edit-page .edit-point-selected-dot,
        .admin-song-edit-page [style*="--status-success"],
        .admin-song-edit-page [style*="--status-error"],
        .admin-song-edit-page [class*="animate-spin"][class*="rounded-full"] {
          border-radius: 999px !important;
        }
      `}</style>

      <AdminSongForm mode="edit" songId={id} />
      <AdminSongAiGeneratedFieldInjector songId={id} />
      <AdminSongRegionFieldInjector songId={id} />
      <AdminSongFormEditPointsLinkInjector songId={id} />
    </div>
  )
}
