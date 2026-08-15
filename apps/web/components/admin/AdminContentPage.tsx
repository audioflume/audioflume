import type { CSSProperties, ReactNode } from "react";
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
  const isPlaylistEdit = resolvedLabel === "Edit Playlist";
  const hidePageIntro =
    resolvedLabel === "Playlist Manager" ||
    resolvedLabel === "Music Library" ||
    isSongUpload ||
    isSongEdit ||
    isPlaylistEdit;
  const usesAdminCanvas =
    resolvedLabel === "Playlist Manager" ||
    resolvedLabel === "Music Library" ||
    isSongUpload ||
    isSongEdit ||
    isPlaylistEdit;
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
        isPlaylistEdit ? "admin-playlist-edit-content-page" : ""
      }`}
    >
      <AdminSidebar />

      <section
        className={`min-h-screen px-5 pt-[88px] ${contentAreaBottomPadding ? "pb-20" : "pb-0"} md:px-8 xl:px-10 ${
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
            compact={compactHeader || isSongUpload || isSongEdit || isPlaylistEdit}
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
        </div>
      </section>
    </main>
  );
}
