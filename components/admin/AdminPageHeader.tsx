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
    <div className="mb-8 flex min-h-12 items-center justify-between gap-4 border-b border-[var(--border)] pb-4">
      <div className="text-xs text-[var(--text-muted)]">
        {section} / <span className="text-[var(--text-primary)]">{label}</span>
      </div>

      {action ? (
        <div className="flex h-8 shrink-0 items-center">{action}</div>
      ) : (
        <div aria-hidden="true" className="hidden h-8 w-0 shrink-0 md:block" />
      )}
    </div>
  );
}
