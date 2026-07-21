// Plain (borderless/transparent, keeps 9px border-radius) — for inline icon actions
export const iconButtonClass =
  "filmwave-icon-button filmwave-icon-button-plain";

export const iconButtonActiveClass =
  "is-open text-[var(--text-primary)]";

// Alias of iconButtonClass — kept for backwards compatibility
export const smallIconButtonClass =
  "filmwave-icon-button filmwave-icon-button-plain";

// Flat (square corners, no border, subtler hover) — for modal close buttons and similar
export const flatIconButtonClass =
  "filmwave-icon-button filmwave-icon-button-flat";

export const pillButtonClass =
  "inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-xs font-semibold transition";

export const primaryPillButtonClass = `${pillButtonClass} bg-[var(--text-primary)] text-[var(--bg-primary)]`;

export const secondaryPillButtonClass = `${pillButtonClass} border border-[var(--border)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]`;

export const dangerButtonClass =
  "text-[var(--danger)] hover:bg-[var(--danger-hover)] hover:text-[var(--danger)]";

// Bordered icon button (border + bg-secondary) — uses the filmwave-icon-button global class
export const borderedIconButtonClass = "filmwave-icon-button";

// Alias of borderedIconButtonClass — kept for backwards compatibility
export const borderedIconButton9Class = "filmwave-icon-button";

export const backPillButtonClass =
  "inline-flex h-8 cursor-pointer items-center gap-2 rounded-md border border-[var(--border)] bg-transparent px-3 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]";

// Navigation link — used in Header and similar nav bars
export const navLinkClass =
  "flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]";

export const modalTitleClass =
  "min-w-0 font-[family-name:var(--font-aktiv-grotesk)] text-[24px] font-medium tracking-[-0.045em] text-[var(--text-primary)]";

export const modalFieldLabelClass =
  "block text-[11px] font-medium text-[var(--text-secondary)]";

export const modalInputClass =
  "mt-2 h-10 w-full rounded-none border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)] disabled:cursor-default disabled:opacity-70";

export const modalTextareaClass =
  "w-full resize-none rounded-none border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-muted)] disabled:cursor-default disabled:opacity-70";

export const modalCoverButtonClass =
  "h-8 cursor-pointer rounded-none border border-[var(--border)] px-3.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-70";

export const modalActionButtonClass =
  "flex h-9 cursor-pointer items-center justify-center rounded-none px-4 text-xs font-medium transition disabled:cursor-default disabled:opacity-70";

export const modalCancelButtonClass = `${modalActionButtonClass} text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]`;

export const modalPrimaryButtonClass = `${modalActionButtonClass} font-[family-name:var(--font-aktiv-grotesk)] min-w-[112px] bg-[var(--text-primary)] font-semibold text-[var(--bg-primary)] hover:opacity-80`;

// Danger/delete button for modal footers
export const modalDeleteButtonClass =
  "flex h-9 cursor-pointer items-center justify-center rounded-none px-3 text-xs font-medium text-[var(--danger)] transition hover:bg-[var(--danger-hover)] hover:text-[var(--danger)] disabled:cursor-default disabled:opacity-70";

export const modalIconCloseButtonClass = flatIconButtonClass;

export const squareButtonClass =
  "inline-flex h-7 cursor-pointer items-center justify-center gap-2 rounded-none border border-[var(--border)] bg-transparent px-2.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-40";

export const primarySquareButtonClass =
  "inline-flex h-7 cursor-pointer items-center justify-center gap-2 rounded-none border border-[var(--text-primary)] bg-[var(--text-primary)] px-2.5 text-xs font-medium text-[var(--bg-primary)] transition hover:opacity-80 disabled:cursor-default disabled:opacity-40";

export const quickFilterButtonClass =
  "cursor-pointer rounded-none bg-[var(--bg-elevated)] px-2 py-[3px] text-[11px] font-medium capitalize leading-[1.2] text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]";

export const quickFilterButtonActiveClass =
  "bg-[var(--bg-hover)] text-[var(--text-primary)]";