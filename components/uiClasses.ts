export const iconButtonClass =
  "flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-[var(--icon-color)] transition hover:bg-[var(--icon-button-hover)] hover:text-[var(--text-primary)]";

export const iconButtonActiveClass =
  "bg-[var(--icon-button-hover)] text-[var(--text-primary)]";

export const smallIconButtonClass =
  "flex h-[28px] w-[28px] cursor-pointer items-center justify-center rounded-md text-[var(--icon-color)] transition hover:bg-[var(--icon-button-hover)] hover:text-[var(--text-primary)]";

export const pillButtonClass =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold transition";

export const primaryPillButtonClass = `${pillButtonClass} bg-[var(--text-primary)] text-[var(--bg-primary)]`;

export const secondaryPillButtonClass = `${pillButtonClass} border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]`;

export const dangerButtonClass =
  "danger-action text-[var(--danger)] hover:text-[var(--danger)]";

export const borderedIconButtonClass =
  "flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--icon-color)] transition hover:border-[var(--border-hover)] hover:bg-[var(--icon-button-hover)] hover:text-[var(--text-primary)]";

export const backPillButtonClass =
  "inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]";
