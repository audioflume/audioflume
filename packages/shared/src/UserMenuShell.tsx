import type { ElementType, MouseEventHandler, ReactNode } from "react";

type ThemeMode = "dark" | "light";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

// ── Arrow icon (used on exit row only) ───────────────────────────────
export function UserMenuArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.6 4.6a1.3 1.3 0 0 1 1.8 0l6 6.5c.5.5.5 1.3 0 1.8l-6 6.5a1.3 1.3 0 0 1-1.9-1.8L13.7 12 8.5 6.4a1.3 1.3 0 0 1 .1-1.8Z"
      />
    </svg>
  );
}

// ── Panel ─────────────────────────────────────────────────────────────
export function UserMenuPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("filmwave-dropdown-shell filmwave-user-menu", className)}>
      {children}
    </div>
  );
}

// ── Profile / identity row ────────────────────────────────────────────
// Gradient pill initial + name + email in one compact row.
export function UserMenuHeader({
  title,
  detail,
}: {
  title: ReactNode;
  detail: ReactNode;
}) {
  const initial =
    typeof title === "string" ? title.charAt(0).toUpperCase() : "F";

  return (
    <div className="filmwave-user-menu-profile">
      <span className="filmwave-user-menu-avatar" aria-hidden="true">
        {initial}
      </span>
      <span className="filmwave-user-menu-identity">
        <span className="filmwave-user-menu-name">{title}</span>
        <span className="filmwave-user-menu-email">{detail}</span>
      </span>
    </div>
  );
}

// ── Action group ──────────────────────────────────────────────────────
export function UserMenuActions({ children }: { children: ReactNode }) {
  return <div className="filmwave-user-menu-actions">{children}</div>;
}

// ── Action row — text only, no icon, no arrow ─────────────────────────
export function UserMenuAction({
  as,
  href,
  label,
  helper,
  onClick,
}: {
  as?: ElementType;
  href?: string;
  label: ReactNode;
  helper?: ReactNode;
  onClick?: MouseEventHandler<HTMLElement>;
}) {
  const Component = as ?? (href ? "a" : "button");
  const props = {
    className: "filmwave-dropdown-item filmwave-user-menu-action",
    onClick,
    ...(href ? { href } : {}),
    ...(Component === "button" ? { type: "button" as const } : {}),
  };

  return (
    <Component {...props}>
      <span className="filmwave-user-menu-action-label">{label}</span>
    </Component>
  );
}

// ── Exit / sign-out row ───────────────────────────────────────────────
export function UserMenuExitAction({
  label,
  trailing,
  onClick,
}: {
  label: ReactNode;
  trailing?: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="filmwave-dropdown-item filmwave-user-menu-exit"
    >
      <span>{label}</span>
      {trailing && (
        <span className="filmwave-user-menu-exit-hint">{trailing}</span>
      )}
    </button>
  );
}

// ── Theme toggle — segmented control ─────────────────────────────────
export function UserMenuThemeToggle({
  theme,
  onThemeChange,
  darkIcon,
  lightIcon,
}: {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  darkIcon: ReactNode;
  lightIcon: ReactNode;
}) {
  const isDark = theme === "dark";
  const isLight = theme === "light";

  return (
    <div className="filmwave-user-menu-theme-wrap">
      <div className="filmwave-user-menu-theme" aria-label="Theme">
        <button
          type="button"
          onClick={() => !isDark && onThemeChange("dark")}
          className={cx(
            "filmwave-user-menu-theme-option",
            isDark && "is-active",
          )}
          aria-pressed={isDark}
        >
          {darkIcon}
          <span>Dark</span>
        </button>
        <button
          type="button"
          onClick={() => !isLight && onThemeChange("light")}
          className={cx(
            "filmwave-user-menu-theme-option",
            isLight && "is-active",
          )}
          aria-pressed={isLight}
        >
          {lightIcon}
          <span>Light</span>
        </button>
      </div>
    </div>
  );
}
