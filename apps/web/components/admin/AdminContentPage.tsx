import type { CSSProperties, ReactNode } from "react";
import Footer from "@/components/Footer";
import AdminCheckboxStyles from "@/components/admin/AdminCheckboxStyles";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

type AdminContentPageProps = {
  section?: string;
  label: string;
  title: string;
  description?: string;
  headerAction?: ReactNode;
  titleAction?: ReactNode;
  compactHeader?: boolean;
  hideIntro?: boolean;
  children: ReactNode;
  contentClassName?: string;
  contentAreaClassName?: string;
  contentAreaBottomPadding?: boolean;
  contentStyle?: CSSProperties;
};

const SIDEBAR_SECTION_BY_LABEL: Record<string, string> = {
  Dashboard: "Admin",
  Engagement: "Admin",
  "Song Upload": "Upload",
  "Upload Song": "Upload",
  "Upload Queue": "Upload",
  "Music Library": "Database",
  "Playlist Manager": "Database",
  "Create Playlist": "Database",
  "Cue Points": "Database",
  "Edit Song": "Database",
  "Edit Playlist": "Database",
  "Storage Health": "System",
  Settings: "System",
};

export default function AdminContentPage({
  section,
  label,
  title,
  description,
  headerAction,
  titleAction,
  compactHeader = false,
  hideIntro = false,
  children,
  contentClassName = "",
  contentAreaClassName = "",
  contentAreaBottomPadding = true,
  contentStyle,
}: AdminContentPageProps) {
  const resolvedLabel =
    label === "Song Editor"
      ? title === "Edit Song"
        ? "Edit Song"
        : "Song Upload"
      : label;
  const isDashboard = resolvedLabel === "Dashboard";
  const isCuePoints = resolvedLabel === "Cue Points";
  const isSongUpload = resolvedLabel === "Song Upload";
  const isSongEdit = resolvedLabel === "Edit Song";
  const isPlaylistCreate = resolvedLabel === "Create Playlist";
  const isPlaylistEdit = resolvedLabel === "Edit Playlist";
  const hidePageIntro =
    hideIntro ||
    isDashboard ||
    isCuePoints ||
    resolvedLabel === "Playlist Manager" ||
    resolvedLabel === "Music Library" ||
    isSongUpload ||
    isSongEdit ||
    isPlaylistCreate ||
    isPlaylistEdit;
  const usesAdminCanvas =
    isDashboard ||
    isCuePoints ||
    resolvedLabel === "Playlist Manager" ||
    resolvedLabel === "Music Library" ||
    isSongUpload ||
    isSongEdit ||
    isPlaylistCreate ||
    isPlaylistEdit;
  const showStandardFooter = isSongUpload || isSongEdit;
  const resolvedContentAreaBottomPadding =
    contentAreaBottomPadding && !showStandardFooter;
  const resolvedContentAreaClassName = usesAdminCanvas
    ? contentAreaClassName
        .replace("bg-[var(--filmwave-neutral-surface)]", "")
        .trim()
    : contentAreaClassName;
  const resolvedSection =
    section ?? SIDEBAR_SECTION_BY_LABEL[resolvedLabel] ?? "Admin";

  return (
    <main
      className={`filmwave-admin-content-page min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)] ${
        isDashboard ? "admin-dashboard-content-page" : ""
      } ${isSongUpload ? "admin-song-upload-content-page" : ""} ${
        isSongEdit ? "admin-song-edit-content-page" : ""
      } ${isPlaylistCreate ? "admin-playlist-create-content-page" : ""} ${
        isPlaylistEdit ? "admin-playlist-edit-content-page" : ""
      }`}
    >
      <AdminSidebar />
      <AdminCheckboxStyles />

      <style>{`
        .filmwave-admin-content-page {
          --admin-top-control-height: 40px;
          --admin-top-control-radius: 7px;
          --admin-top-toolbar-gap: 16px;
        }

        /* Missing-content messages use the small Playlist Manager section treatment. */
        .filmwave-admin-content-page
          [class~="min-h-[180px]"][class~="items-center"][class~="justify-center"],
        .filmwave-admin-content-page
          [class~="min-h-[120px]"][class~="items-center"][class~="justify-center"][class~="border-dashed"],
        .filmwave-admin-content-page
          .admin-music-library-song-list
          > [class~="min-h-[180px]"][class~="items-center"][class~="justify-center"],
        .filmwave-admin-content-page.admin-playlist-edit-content-page
          form
          + section
          > [class~="border-dashed"] {
          color: var(--text-secondary);
          font-family: inherit;
          font-size: 12px;
          font-weight: 400;
          line-height: 16px;
          letter-spacing: normal;
        }

        /* Top-page controls share one box and one baseline across admin pages. */
        .filmwave-admin-content-page
          div:has(> div > [role="searchbox"]),
        .filmwave-admin-content-page
          div:has(> a[href="/admin/playlist-manager/new"]) {
          height: var(--admin-top-control-height);
          min-height: var(--admin-top-control-height);
          margin-bottom: var(--admin-top-toolbar-gap) !important;
          align-items: center;
        }

        .filmwave-admin-content-page [role="searchbox"],
        .filmwave-admin-content-page > section a[href="/admin/songs/new"],
        .filmwave-admin-content-page a[href="/admin/playlist-manager/new"],
        .filmwave-admin-content-page
          div:has(> a[href="/admin/playlist-manager/new"])
          > div:first-child
          > button {
          box-sizing: border-box;
          height: var(--admin-top-control-height) !important;
          min-height: var(--admin-top-control-height);
          margin-top: 0;
          margin-bottom: 0;
          border-radius: var(--admin-top-control-radius) !important;
        }

        .filmwave-admin-content-page div:has(> [role="searchbox"]) {
          height: var(--admin-top-control-height);
          min-height: var(--admin-top-control-height);
        }

        /* File action rows sit outside a bordered card; offset the card border itself. */
        :is(.admin-song-upload-content-page, .admin-song-edit-content-page)
          :is(.admin-song-upload-file-actions, .admin-song-edit-file-actions) {
          top: -57px !important;
          left: -1px !important;
          height: var(--admin-top-control-height);
          min-height: var(--admin-top-control-height);
          align-items: center;
        }

        :is(.admin-song-upload-content-page, .admin-song-edit-content-page)
          :is(.admin-song-upload-file-action, .admin-song-edit-file-action) {
          box-sizing: border-box;
          height: var(--admin-top-control-height) !important;
          min-height: var(--admin-top-control-height);
          margin: 0;
          border-radius: var(--admin-top-control-radius) !important;
        }

        /* Files use stacked field rows, with each label inside its field. */
        main.filmwave-admin-content-page:is(
            .admin-song-upload-content-page,
            .admin-song-edit-content-page
          )
          :is(.admin-song-upload-files-bin, .admin-song-edit-files-bin) {
          display: block !important;
          padding: 20px !important;
        }

        main.filmwave-admin-content-page:is(
            .admin-song-upload-content-page,
            .admin-song-edit-content-page
          )
          :is(.admin-song-upload-files-bin, .admin-song-edit-files-bin)
          > .admin-song-form-card-header {
          min-height: 0 !important;
          margin: 0 0 12px !important;
          border: 0 !important;
          border-radius: 0 !important;
          padding: 0 !important;
        }

        main.filmwave-admin-content-page:is(
            .admin-song-upload-content-page,
            .admin-song-edit-content-page
          )
          :is(.admin-song-upload-files-bin, .admin-song-edit-files-bin)
          > .admin-song-form-card-header
          + div {
          display: grid !important;
          grid-template-columns: 1fr !important;
          gap: 8px !important;
          padding: 0 !important;
        }

        main.filmwave-admin-content-page:is(
            .admin-song-upload-content-page,
            .admin-song-edit-content-page
          )
          :is(.admin-song-upload-files-bin, .admin-song-edit-files-bin)
          .admin-song-file-row {
          position: relative;
          display: grid !important;
          min-width: 0;
          min-height: 40px;
          grid-template-columns: 72px minmax(0, 1fr) auto !important;
          grid-template-rows: auto !important;
          align-items: center !important;
          gap: 12px !important;
          border: 1px solid var(--border) !important;
          border-radius: 7px !important;
          background: var(--bg-primary);
          padding: 0 12px !important;
        }

        main.filmwave-admin-content-page:is(
            .admin-song-upload-content-page,
            .admin-song-edit-content-page
          )
          :is(.admin-song-upload-files-bin, .admin-song-edit-files-bin)
          .admin-song-file-row
          > div:first-child {
          grid-column: 1 !important;
          grid-row: 1 !important;
          align-self: center !important;
          padding: 0 !important;
        }

        main.filmwave-admin-content-page:is(
            .admin-song-upload-content-page,
            .admin-song-edit-content-page
          )
          :is(.admin-song-upload-files-bin, .admin-song-edit-files-bin)
          .admin-song-file-row
          > div:first-child
          > div:first-child {
          font-size: 12px !important;
          font-weight: 500 !important;
          line-height: 18px !important;
          letter-spacing: normal !important;
          text-transform: none !important;
        }

        main.filmwave-admin-content-page:is(
            .admin-song-upload-content-page,
            .admin-song-edit-content-page
          )
          :is(.admin-song-upload-files-bin, .admin-song-edit-files-bin)
          .admin-song-file-row
          > div:nth-child(2) {
          grid-column: 2 !important;
          grid-row: 1 !important;
          min-width: 0;
          margin: 0 !important;
        }

        main.filmwave-admin-content-page:is(
            .admin-song-upload-content-page,
            .admin-song-edit-content-page
          )
          :is(.admin-song-upload-files-bin, .admin-song-edit-files-bin)
          .admin-song-file-row
          > div:nth-child(2)
          > div[class~="h-9"] {
          height: auto !important;
          min-height: 0 !important;
          gap: 0 !important;
          border: 0 !important;
          border-radius: 0 !important;
          background: transparent !important;
          padding: 0 !important;
        }

        main.filmwave-admin-content-page:is(
            .admin-song-upload-content-page,
            .admin-song-edit-content-page
          )
          :is(.admin-song-upload-files-bin, .admin-song-edit-files-bin)
          .admin-song-file-row
          > div:nth-child(2)
          > div[class~="h-9"]
          > button {
          display: none !important;
        }

        main.filmwave-admin-content-page:is(
            .admin-song-upload-content-page,
            .admin-song-edit-content-page
          )
          :is(.admin-song-upload-files-bin, .admin-song-edit-files-bin)
          .admin-song-file-row
          > div:nth-child(2)
          > div[class~="h-9"]
          > span {
          font-size: 12px;
          line-height: 18px;
        }

        main.filmwave-admin-content-page:is(
            .admin-song-upload-content-page,
            .admin-song-edit-content-page
          )
          :is(.admin-song-upload-files-bin, .admin-song-edit-files-bin)
          .admin-song-file-row
          > div:last-child:not(:nth-child(2)) {
          grid-column: 3 !important;
          grid-row: 1 !important;
          align-self: center !important;
          justify-self: end !important;
          margin: 0 !important;
        }

        /* Keep the cover thumbnail outside the bordered Cover field, as before. */
        main.filmwave-admin-content-page:is(
            .admin-song-upload-content-page,
            .admin-song-edit-content-page
          )
          :is(.admin-song-upload-files-bin, .admin-song-edit-files-bin)
          .admin-song-file-row:nth-child(2):has(img) {
          margin-right: 52px !important;
        }

        main.filmwave-admin-content-page:is(
            .admin-song-upload-content-page,
            .admin-song-edit-content-page
          )
          :is(.admin-song-upload-files-bin, .admin-song-edit-files-bin)
          .admin-song-file-row:nth-child(2):has(img)
          > div:last-child:not(:nth-child(2)) {
          position: absolute !important;
          top: 50% !important;
          right: -52px !important;
          width: 40px !important;
          height: 40px !important;
          transform: translateY(-50%);
        }

        @media (max-width: 640px) {
          main.filmwave-admin-content-page:is(
              .admin-song-upload-content-page,
              .admin-song-edit-content-page
            )
            :is(.admin-song-upload-files-bin, .admin-song-edit-files-bin)
            .admin-song-file-row {
            grid-template-columns: 64px minmax(0, 1fr) auto !important;
            gap: 8px !important;
          }
        }
      `}</style>

      <section
        className={`min-h-screen px-5 pt-[88px] ${resolvedContentAreaBottomPadding ? "pb-20" : "pb-0"} md:px-8 xl:px-10 ${
          usesAdminCanvas ? "bg-[var(--filmwave-admin-canvas)]" : ""
        } ${resolvedContentAreaClassName}`}
      >
        <div
          className={`mx-auto max-w-[1180px] ${contentClassName}`}
          style={contentStyle}
        >
          <AdminPageHeader
            section={resolvedSection}
            label={resolvedLabel}
            action={headerAction}
            compact={
              compactHeader ||
              isDashboard ||
              isCuePoints ||
              isSongUpload ||
              isSongEdit ||
              isPlaylistCreate ||
              isPlaylistEdit
            }
          />

          {!hidePageIntro ? (
            <div className="mb-8 flex min-h-[58px] items-end justify-between gap-4">
              <div className="min-w-0">
                <h1 className="font-[family-name:var(--font-aktiv-grotesk)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
                  {title}
                </h1>

                {description ? (
                  <p className="mt-2 max-w-[620px] text-sm leading-6 text-[var(--text-secondary)]">
                    {description}
                  </p>
                ) : null}
              </div>

              {titleAction ? (
                <div className="flex h-8 shrink-0 items-center">{titleAction}</div>
              ) : (
                <div
                  aria-hidden="true"
                  className="hidden h-8 w-0 shrink-0 md:block"
                />
              )}
            </div>
          ) : null}

          {children}

          {showStandardFooter ? (
            <Footer className="!px-0" playerPadding={false} showTopBorder={false} />
          ) : null}
        </div>
      </section>
    </main>
  );
}
