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
  children: ReactNode;
  contentClassName?: string;
  contentStyle?: CSSProperties;
};

export default function AdminContentPage({
  section = "Admin",
  label,
  title,
  description,
  headerAction,
  titleAction,
  children,
  contentClassName = "",
  contentStyle,
}: AdminContentPageProps) {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] pt-14 text-[var(--text-primary)] md:ml-[var(--admin-sidebar-width)]">
      <AdminSidebar />

      <section className="min-h-screen px-5 pt-[88px] pb-20 md:px-8 xl:px-10">
        <div
          className={`mx-auto max-w-[1180px] ${contentClassName}`}
          style={contentStyle}
        >
          <AdminPageHeader section={section} label={label} action={headerAction} />

          <div className="mb-8 flex min-h-[58px] items-end justify-between gap-4">
            <div className="min-w-0">
              <h1 className="font-[family-name:var(--font-instrument-sans)] text-[34px] font-medium leading-none tracking-[-0.045em] text-[var(--text-primary)]">
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
              <div aria-hidden="true" className="hidden h-8 w-0 shrink-0 md:block" />
            )}
          </div>

          {children}
        </div>
      </section>
    </main>
  );
}
