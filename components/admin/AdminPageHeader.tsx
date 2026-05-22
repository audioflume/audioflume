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
    <div className="admin-account-page-header flex items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
      <div className="text-xs font-normal text-[var(--text-muted)]">
        {section} / <span className="text-[var(--text-secondary)]">{label}</span>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
