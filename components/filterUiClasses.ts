// components/filterUiClasses.ts

export const filterTriggerBaseClass =
  "flex h-7 cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] px-2.5 text-xs font-medium transition-colors";

export const filterTriggerActiveClass =
  "bg-[var(--bg-secondary)] text-[var(--text-primary)]";

export const filterTriggerInactiveClass =
  "bg-transparent text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]";

export const filterDropdownPanelClass =
  "w-[280px] rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[var(--shadow-ui)]";

export const filterDropdownWidePanelClass =
  "w-[320px] rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[var(--shadow-ui)]";

export const filterDropdownHeaderClass =
  "flex h-9 items-center justify-between border-b border-[var(--border)] px-3";

export const filterDropdownTitleClass =
  "text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]";

export const filterClearButtonClass =
  "text-[11px] font-medium text-[var(--text-secondary)] transition hover:text-[var(--text-primary)]";

export const filterRowButtonClass =
  "flex h-8 w-full cursor-pointer items-center justify-between rounded-lg px-2.5 text-left text-xs font-medium transition-colors";

export const filterRowButtonInactiveClass =
  "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]";

export const filterRowButtonActiveClass =
  "bg-[var(--bg-hover-strong)] text-[var(--text-primary)]";

export const filterSegmentWrapClass =
  "grid w-full rounded-lg bg-[var(--bg-primary)] p-1";

export const filterSegmentButtonClass =
  "h-7 cursor-pointer rounded-md text-xs font-medium transition-colors";

export const filterSegmentButtonInactiveClass =
  "text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]";

export const filterSegmentButtonActiveClass =
  "bg-[var(--bg-hover-strong)] text-[var(--text-primary)]";

export const filterSummaryClass =
  "mt-3 flex h-8 items-center justify-between gap-3 rounded-lg bg-[var(--bg-tertiary)] px-3";

export const filterSummaryLabelClass =
  "text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]";

export const filterSummaryValueClass =
  "truncate text-xs font-medium text-[var(--text-primary)]";

export const filterDotClass =
  "h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[var(--accent)]";

export const filterInputClass =
  "h-8 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-2.5 text-xs text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--text-secondary)]";

export const filterIntentButtonClass =
  "flex min-h-10 cursor-pointer flex-col items-center justify-center rounded-lg border border-[var(--border)] px-2 py-2 text-center text-xs font-medium transition-colors";

export const filterIntentButtonInactiveClass =
  "bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover-strong)] hover:text-[var(--text-primary)]";

export const filterIntentButtonActiveClass =
  "bg-[var(--bg-hover-strong)] text-[var(--text-primary)]";
