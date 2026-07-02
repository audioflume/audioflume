import AdminSongForm from '@/components/admin/AdminSongForm'
import AdminSongAiGeneratedFieldInjector from '@/components/admin/AdminSongAiGeneratedFieldInjector'
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

        .admin-song-upload-page [style*="--status-success"],
        .admin-song-upload-page [style*="--status-error"],
        .admin-song-upload-page [class*="animate-spin"][class*="rounded-full"] {
          border-radius: 999px !important;
        }
      `}</style>

      <AdminSongForm mode="create" />
      <AdminSongAiGeneratedFieldInjector />
      <AdminSongRegionFieldInjector />
      <AdminSongFormEditPointsLinkInjector />
    </div>
  )
}
