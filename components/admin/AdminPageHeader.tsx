import type { ReactNode } from "react";

type AdminPageHeaderProps = {
  section?: string;
  label: string;
  action?: ReactNode;
};

export default function AdminPageHeader({
  section = "Admin",
  label,
  action,
}: AdminPageHeaderProps) {
  return (
    <div className="admin-account-page-header mb-8 flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
      <div className="text-xs text-[var(--text-muted)]">
        {section} / <span className="text-[var(--text-primary)]">{label}</span>
      </div>
      {action ? <div className="shrink-0">{action}</div> : <div aria-hidden="true" className="h-8 w-0 shrink-0" />}
    </div>
  );
}
