"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import CheckMarkIcon from "@/components/icons/CheckMarkIcon";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type BackendButtonVariant =
  | "primary"
  | "secondary"
  | "secondary-danger"
  | "danger";

type BackendButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: BackendButtonVariant;
  compact?: boolean;
};

export const BackendButton = forwardRef<HTMLButtonElement, BackendButtonProps>(
  function BackendButton(
    { variant = "secondary", compact = false, className = "", ...props },
    ref,
  ) {
    const variantClass =
      variant === "primary"
        ? "filmwave-backend-button-primary"
        : variant === "secondary-danger"
          ? "filmwave-backend-button-secondary-danger"
          : variant === "danger"
            ? "filmwave-backend-button-danger"
            : "filmwave-backend-button-secondary";

    return (
      <button
        ref={ref}
        className={joinClasses(
          "filmwave-backend-button",
          variantClass,
          compact && "filmwave-backend-button-compact",
          className,
        )}
        {...props}
      />
    );
  },
);

type BackendIconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  colorOnly?: boolean;
};

export const BackendIconButton = forwardRef<
  HTMLButtonElement,
  BackendIconButtonProps
>(function BackendIconButton(
  { active = false, colorOnly = false, className = "", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={joinClasses(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-[7px] border-0 bg-transparent text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none",
        !colorOnly && "hover:bg-[var(--bg-hover)] focus-visible:bg-[var(--bg-hover)]",
        active && "bg-[var(--bg-hover)] text-[var(--text-primary)]",
        className,
      )}
      {...props}
    />
  );
});

export const BackendInput = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function BackendInput({ className = "", ...props }, ref) {
  return (
    <input
      ref={ref}
      className={joinClasses("filmwave-backend-input", className)}
      {...props}
    />
  );
});

export const BackendSelect = forwardRef<
  HTMLSelectElement,
  SelectHTMLAttributes<HTMLSelectElement>
>(function BackendSelect({ className = "", ...props }, ref) {
  return (
    <select
      ref={ref}
      className={joinClasses("filmwave-backend-select", className)}
      {...props}
    />
  );
});

export const BackendTextarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function BackendTextarea({ className = "", ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={joinClasses("filmwave-backend-textarea", className)}
      {...props}
    />
  );
});

type BackendCheckboxProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
  compact?: boolean;
  size?: "sm" | "md";
  className?: string;
  ariaLabel?: string;
};

export function BackendCheckbox({
  checked,
  onChange,
  label,
  disabled = false,
  compact = false,
  size = "md",
  className = "",
  ariaLabel,
}: BackendCheckboxProps) {
  return (
    <label
      className={joinClasses(
        "group/backend-checkbox inline-flex items-center text-xs font-[320]",
        compact ? "min-h-0 gap-0" : "min-h-10 gap-2.5",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        checked ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]",
        className,
      )}
      aria-label={ariaLabel}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="peer sr-only"
      />
      <span
        className={joinClasses(
          "filmwave-backend-checkbox-box flex shrink-0 items-center justify-center border-[1.5px] border-[var(--border)] bg-[var(--bg-secondary)] transition group-hover/backend-checkbox:border-[var(--text-secondary)] peer-checked:border-[var(--text-primary)] peer-checked:bg-[var(--text-primary)] peer-checked:[&>svg]:opacity-100",
          size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4",
        )}
      >
        <CheckMarkIcon
          size={10}
          strokeWidth={3}
          className="opacity-0 text-[var(--bg-primary)] transition"
        />
      </span>
      {label ? <span>{label}</span> : null}
    </label>
  );
}

type BackendChoiceButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export function BackendChoiceButton({
  active = false,
  className = "",
  ...props
}: BackendChoiceButtonProps) {
  return (
    <button
      className={joinClasses(
        "filmwave-backend-choice-button",
        active && "is-active",
        className,
      )}
      {...props}
    />
  );
}

type BackendStatusBadgeProps = {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning" | "error";
  className?: string;
};

export function BackendStatusBadge({
  children,
  tone = "neutral",
  className = "",
}: BackendStatusBadgeProps) {
  const toneClass =
    tone === "success"
      ? "bg-[var(--status-success-soft)] text-[var(--status-success)]"
      : tone === "warning"
        ? "bg-[var(--status-warning-soft)] text-[var(--status-warning)]"
        : tone === "error"
          ? "bg-[var(--status-error-soft)] text-[var(--status-error)]"
          : "bg-[var(--bg-tertiary)] text-[var(--text-secondary)]";

  return (
    <span
      className={joinClasses(
        "filmwave-backend-status-badge",
        toneClass,
        className,
      )}
    >
      {children}
    </span>
  );
}

type BackendSectionProps = {
  children: ReactNode;
  className?: string;
};

export function BackendSection({ children, className = "" }: BackendSectionProps) {
  return (
    <section className={joinClasses("filmwave-backend-section", className)}>
      {children}
    </section>
  );
}

type BackendSectionHeaderProps = {
  title: ReactNode;
  action?: ReactNode;
  bordered?: boolean;
  className?: string;
};

export function BackendSectionHeader({
  title,
  action,
  bordered = false,
  className = "",
}: BackendSectionHeaderProps) {
  return (
    <div
      className={joinClasses(
        bordered
          ? "filmwave-backend-section-header-bordered"
          : "filmwave-backend-section-header",
        className,
      )}
    >
      <h2 className="filmwave-backend-section-title">{title}</h2>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
