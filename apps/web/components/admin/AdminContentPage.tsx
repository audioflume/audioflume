import type { CSSProperties, ReactNode } from "react";
import Footer from "@/components/Footer";
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
  const isSongUpload = resolvedLabel === "Song Upload";
  const isSongEdit = resolvedLabel === "Edit Song";
  const isPlaylistCreate = resolvedLabel === "Create Playlist";
  const isPlaylistEdit = resolvedLabel === "Edit Playlist";
  const hidePageIntro =
    resolvedLabel === "Playlist Manager" ||
    resolvedLabel === "Music Library" ||
    isSongUpload ||
    isSongEdit ||
    isPlaylistCreate ||
    isPlaylistEdit;
  const usesAdminCanvas =
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
        isSongUpload ? "admin-song-upload-content-page" : ""
      } ${isSongEdit ? "admin-song-edit-content-page" : ""} ${
        isPlaylistCreate ? "admin-playlist-create-content-page" : ""
      } ${isPlaylistEdit ? "admin-playlist-edit-content-page" : ""}`}
    >
      <AdminSidebar />

      <style>{`
        .filmwave-admin-content-page {
          --admin-top-control-height: 40px;
          --admin-top-control-radius: 7px;
          --admin-top-toolbar-gap: 16px;
        }

        /* Missing-content messages use the small Playlist Manager section treatment. */
        .filmwave-admin-content-page
          [class~="min-h-[180px]"][class~="items-center"][class~="justify-center"][class~="border"],
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
        .filmwave-admin-content-page a[href="/admin/songs/new"],
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
