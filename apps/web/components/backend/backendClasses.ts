// Backend-only class contracts for places that cannot directly render the shared
// React control components (for example Next.js Link actions and third-party
// trigger render props). New ordinary controls should prefer BackendControls.tsx.

export const backendButtonClass = "filmwave-backend-button";
export const backendPrimaryButtonClass =
  "filmwave-backend-button filmwave-backend-button-primary";
export const backendSecondaryButtonClass =
  "filmwave-backend-button filmwave-backend-button-secondary";
export const backendSecondaryDangerButtonClass =
  "filmwave-backend-button filmwave-backend-button-secondary-danger";
export const backendDangerButtonClass =
  "filmwave-backend-button filmwave-backend-button-danger";
export const backendCompactSecondaryButtonClass =
  "filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-secondary";
export const backendCompactPrimaryButtonClass =
  "filmwave-backend-button filmwave-backend-button-compact filmwave-backend-button-primary";

export const backendIconButtonClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border-0 bg-transparent text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] focus-visible:bg-[var(--bg-hover)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none";
export const backendIconButtonColorOnlyClass =
  "flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border-0 bg-transparent text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none";
export const backendIconButtonActiveClass =
  "bg-[var(--bg-hover)] text-[var(--text-primary)]";

export const backendModalActionButtonClass =
  "filmwave-backend-button";
export const backendModalCancelButtonClass =
  "filmwave-backend-button filmwave-backend-button-secondary";
export const backendModalPrimaryButtonClass =
  "filmwave-backend-button filmwave-backend-button-primary";
export const backendModalDeleteButtonClass =
  "filmwave-backend-button filmwave-backend-button-secondary-danger";
