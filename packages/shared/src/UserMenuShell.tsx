import type { ElementType, MouseEventHandler, ReactNode } from "react";

type ThemeMode = "dark" | "light";
export type UserMenuGlyphName =
  | "settings"
  | "membership"
  | "payment"
  | "security"
  | "support"
  | "sync"
  | "sign-in"
  | "sign-out"
  | "appearance";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function UserMenuGlyph({ name }: { name: UserMenuGlyphName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
      {name === "settings" && (
        <>
          <path {...common} d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h8M16 17h4" />
          <circle {...common} cx="15" cy="7" r="2" />
          <circle {...common} cx="9" cy="12" r="2" />
          <circle {...common} cx="14" cy="17" r="2" />
        </>
      )}
      {name === "membership" && (
        <>
          <rect {...common} x="5" y="4.5" width="14" height="15" rx="2" />
          <path {...common} d="M8.5 9h7M8.5 13h5" />
        </>
      )}
      {name === "payment" && (
        <>
          <rect {...common} x="4" y="6" width="16" height="12" rx="2" />
          <path {...common} d="M4 10h16M8 15h3" />
        </>
      )}
      {name === "security" && (
        <path {...common} d="M12 3.8 18 6v5.2c0 4-2.3 7-6 9-3.7-2-6-5-6-9V6l6-2.2Z" />
      )}
      {name === "support" && (
        <>
          <circle {...common} cx="12" cy="12" r="8" />
          <path {...common} d="M9.8 9.4a2.4 2.4 0 1 1 3.5 2.1c-.8.4-1.3 1-1.3 1.8" />
          <path {...common} d="M12 16.5h.01" />
        </>
      )}
      {name === "sync" && (
        <>
          <path {...common} d="M7 7h9l-2.5-2.5M17 17H8l2.5 2.5" />
          <path {...common} d="M18.5 8.5A7 7 0 0 1 19 12M5.5 15.5A7 7 0 0 1 5 12" />
        </>
      )}
      {name === "sign-in" && (
        <>
          <path {...common} d="M10 5H6.5A1.5 1.5 0 0 0 5 6.5v11A1.5 1.5 0 0 0 6.5 19H10" />
          <path {...common} d="M13 8l4 4-4 4M9 12h8" />
        </>
      )}
      {name === "sign-out" && (
        <>
          <path {...common} d="M14 5h3.5A1.5 1.5 0 0 1 19 6.5v11a1.5 1.5 0 0 1-1.5 1.5H14" />
          <path {...common} d="m11 8-4 4 4 4M7 12h8" />
        </>
      )}
      {name === "appearance" && (
        <>
          <circle {...common} cx="12" cy="12" r="8" />
          <path d="M12 4a8 8 0 0 0 0 16Z" fill="currentColor" />
        </>
      )}
    </svg>
  );
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
export function UserMenuHeader({
  title,
  detail,
  imageSrc,
}: {
  title: ReactNode;
  detail: ReactNode;
  imageSrc?: string | null;
}) {
  const initial =
    typeof title === "string" ? title.charAt(0).toUpperCase() : "A";

  return (
    <div className="filmwave-user-menu-profile">
      <span className="filmwave-user-menu-avatar" aria-hidden="true">
        {imageSrc ? <img src={imageSrc} alt="" /> : initial}
      </span>
      <span className="filmwave-user-menu-identity">
        <span className="filmwave-user-menu-name">{title}</span>
        <span className="filmwave-user-menu-email">{detail}</span>
      </span>
    </div>
  );
}

// ── Action group ──────────────────────────────────────────────────────
export function UserMenuActions({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("filmwave-user-menu-actions", className)}>{children}</div>
  );
}

// ── Action row ────────────────────────────────────────────────────────
export function UserMenuAction({
  as,
  href,
  label,
  helper,
  icon,
  onClick,
}: {
  as?: ElementType;
  href?: string;
  label: ReactNode;
  helper?: ReactNode;
  icon?: UserMenuGlyphName;
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
      {icon && (
        <span className="filmwave-user-menu-action-icon" aria-hidden="true">
          <UserMenuGlyph name={icon} />
        </span>
      )}
      <span className="filmwave-user-menu-action-label">{label}</span>
    </Component>
  );
}

// ── Exit / sign-out row ───────────────────────────────────────────────
export function UserMenuExitAction({
  label,
  trailing,
  icon,
  onClick,
}: {
  label: ReactNode;
  trailing?: ReactNode;
  icon?: UserMenuGlyphName;
  onClick?: MouseEventHandler<HTMLButtonElement>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="filmwave-dropdown-item filmwave-user-menu-exit"
    >
      {icon && (
        <span className="filmwave-user-menu-action-icon" aria-hidden="true">
          <UserMenuGlyph name={icon} />
        </span>
      )}
      <span>{label}</span>
      {trailing && (
        <span className="filmwave-user-menu-exit-hint">{trailing}</span>
      )}
    </button>
  );
}

// ── Appearance — single light/dark action row ─────────────────────────
export function UserMenuThemeToggle({
  theme,
  onThemeChange,
}: {
  theme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}) {
  const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";
  const currentThemeLabel = theme === "dark" ? "Dark" : "Light";

  return (
    <button
      type="button"
      onClick={() => onThemeChange(nextTheme)}
      className="filmwave-dropdown-item filmwave-user-menu-theme-action"
      aria-label={`Switch to ${nextTheme} mode`}
    >
      <span className="filmwave-user-menu-theme-icon" aria-hidden="true">
        <UserMenuGlyph name="appearance" />
      </span>
      <span className="filmwave-user-menu-action-label">Appearance</span>
      <span className="filmwave-user-menu-theme-value">{currentThemeLabel}</span>
    </button>
  );
}
