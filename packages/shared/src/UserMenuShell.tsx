import type { ElementType, MouseEventHandler, ReactNode } from "react";

type ThemeMode = "dark" | "light";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function UserMenuArrowIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 6L15 12L9 18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function UserMenuPanel({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx("filmwave-user-menu", className)}>{children}</div>;
}

export function UserMenuHeader({
  title,
  detail,
}: {
  title: ReactNode;
  detail: ReactNode;
}) {
  return (
    <div className="filmwave-user-menu-head">
      <div className="filmwave-user-menu-title">{title}</div>
      <div className="filmwave-user-menu-detail">{detail}</div>
    </div>
  );
}

export function UserMenuActions({ children }: { children: ReactNode }) {
  return <div className="filmwave-user-menu-actions">{children}</div>;
}

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
  helper: ReactNode;
  onClick?: MouseEventHandler<HTMLElement>;
}) {
  const Component = as ?? (href ? "a" : "button");
  const props = {
    className: "filmwave-user-menu-action",
    onClick,
    ...(href ? { href } : {}),
    ...(Component === "button" ? { type: "button" as const } : {}),
  };

  return (
    <Component {...props}>
      <div className="filmwave-user-menu-action-copy">
        <div className="filmwave-user-menu-action-title">{label}</div>
        <div className="filmwave-user-menu-action-helper">{helper}</div>
      </div>

      <div className="filmwave-user-menu-action-arrow">
        <UserMenuArrowIcon />
      </div>
    </Component>
  );
}

export function UserMenuExitAction({
  label,
  trailing,
  onClick,
}: {
  label: ReactNode;
  trailing: ReactNode;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button type="button" onClick={onClick} className="filmwave-user-menu-exit">
      <span>{label}</span>
      <span>{trailing}</span>
    </button>
  );
}

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
      <div className="filmwave-user-menu-theme" aria-label="Theme setting">
        <button
          type="button"
          onClick={() => !isDark && onThemeChange("dark")}
          className={cx("filmwave-user-menu-theme-option is-dark", isDark && "is-active")}
          aria-label="Dark mode"
          aria-pressed={isDark}
        >
          {darkIcon}
          <span>Dark</span>
        </button>

        <button
          type="button"
          onClick={() => !isLight && onThemeChange("light")}
          className={cx("filmwave-user-menu-theme-option is-light", isLight && "is-active")}
          aria-label="Light mode"
          aria-pressed={isLight}
        >
          {lightIcon}
          <span>Light</span>
        </button>
      </div>
    </div>
  );
}
