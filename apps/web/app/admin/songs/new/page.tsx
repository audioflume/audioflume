import AdminSongForm from '@/components/admin/AdminSongForm'
import AdminSongFormEditPointsLinkInjector from '@/components/admin/AdminSongFormEditPointsLinkInjector'
import AdminSongRegionFieldInjector from '@/components/admin/AdminSongRegionFieldInjector'

export default function NewSongPage() {
  return (
    <div className="admin-song-upload-page">
      <style>{`
        .admin-song-upload-page :where(
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
        .admin-song-upload-page .admin-song-form-card,
        .admin-song-upload-page .admin-song-form-icon-btn {
          border-radius: 0 !important;
        }
      `}</style>

      <AdminSongForm mode="create" />
      <AdminSongRegionFieldInjector />
      <AdminSongFormEditPointsLinkInjector />
    </div>
  )
}
