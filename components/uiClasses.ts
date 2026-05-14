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

export const modalTitleClass =
  "min-w-0 font-[family-name:var(--font-instrument-sans)] text-[15px] font-medium tracking-[-0.01em] text-[var(--text-primary)]";

export const modalFieldLabelClass =
  "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]";

export const modalInputClass =
  "h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-secondary)] disabled:cursor-default disabled:opacity-70";

export const modalTextareaClass =
  "w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-secondary)] disabled:cursor-default disabled:opacity-70";

export const modalCoverButtonClass =
  "h-8 cursor-pointer rounded-md border border-[var(--border)] px-3.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-70";

export const modalActionButtonClass =
  "flex h-8 cursor-pointer items-center justify-center rounded-md px-3.5 text-xs font-medium transition disabled:cursor-default disabled:opacity-70";

export const modalCancelButtonClass = `${modalActionButtonClass} text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]`;

export const modalPrimaryButtonClass = `${modalActionButtonClass} font-[family-name:var(--font-instrument-sans)] min-w-[104px] bg-[var(--text-primary)] font-semibold text-[var(--bg-primary)] hover:opacity-80`;

export const modalDeleteButtonClass = `${modalActionButtonClass} ${dangerButtonClass} px-0`;

export const modalIconCloseButtonClass = iconButtonClass;
