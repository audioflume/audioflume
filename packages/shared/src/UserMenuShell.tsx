import type { ElementType, MouseEventHandler, ReactNode } from "react";

type ThemeMode = "dark" | "light";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Solid icon set — filled glyphs, no thin outlines                    */
/* ------------------------------------------------------------------ */

function MenuIconBase({ children, size = 15 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {children}
    </svg>
  );
}

function PersonSolidIcon() {
  return (
    <MenuIconBase>
      <path
        fill="currentColor"
        d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2.2c-4 0-7.5 2.1-7.5 4.9 0 1 .8 1.9 1.9 1.9h11.2c1 0 1.9-.8 1.9-1.9 0-2.8-3.5-4.9-7.5-4.9Z"
      />
    </MenuIconBase>
  );
}

function GearSolidIcon() {
  return (
    <MenuIconBase>
      <path
        fill="currentColor"
        d="M13.9 2.6c.5.1.9.5 1 1l.3 1.7c.5.2 1 .5 1.4.8l1.6-.6c.5-.2 1.1 0 1.4.5l1.3 2.2c.3.5.2 1.1-.2 1.4l-1.3 1.2c0 .3.1.5.1.8s0 .5-.1.8l1.3 1.2c.4.4.5 1 .2 1.4l-1.3 2.2c-.3.5-.9.7-1.4.5l-1.6-.6c-.4.3-.9.6-1.4.8l-.3 1.7c-.1.5-.5 1-1 1h-2.6c-.5 0-1-.4-1.1-1l-.3-1.7c-.5-.2-1-.5-1.4-.8l-1.6.6c-.5.2-1.1 0-1.4-.5l-1.3-2.2c-.3-.5-.2-1.1.2-1.4l1.3-1.2c0-.3-.1-.5-.1-.8s0-.5.1-.8L4.4 9.6c-.4-.4-.5-1-.2-1.4l1.3-2.2c.3-.5.9-.7 1.4-.5l1.6.6c.4-.3.9-.6 1.4-.8l.3-1.7c.1-.5.5-1 1.1-1h2.6ZM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z"
      />
    </MenuIconBase>
  );
}

function DeviceSolidIcon() {
  return (
    <MenuIconBase>
      <path
        fill="currentColor"
        d="M8.5 2.5h7A2.5 2.5 0 0 1 18 5v14a2.5 2.5 0 0 1-2.5 2.5h-7A2.5 2.5 0 0 1 6 19V5a2.5 2.5 0 0 1 2.5-2.5Zm3.5 16a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z"
      />
    </MenuIconBase>
  );
}

function DocSolidIcon() {
  return (
    <MenuIconBase>
      <path
        fill="currentColor"
        d="M7 2h7l5 5v13a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm6.5 1.5V8H18l-4.5-4.5ZM8.5 12.2c-.5 0-.9.4-.9.9s.4.9.9.9h7c.5 0 .9-.4.9-.9s-.4-.9-.9-.9h-7Zm0 3.8c-.5 0-.9.4-.9.9s.4.9.9.9h4.6c.5 0 .9-.4.9-.9s-.4-.9-.9-.9H8.5Z"
      />
    </MenuIconBase>
  );
}

function ExternalSolidIcon() {
  return (
    <MenuIconBase>
      <path
        fill="currentColor"
        d="M14.2 3.3c0-.7.6-1.3 1.3-1.3h5.2c.7 0 1.3.6 1.3 1.3v5.2a1.3 1.3 0 1 1-2.6 0V6.4l-7 7a1.3 1.3 0 0 1-1.8-1.8l7-7h-2.1a1.3 1.3 0 0 1-1.3-1.3ZM5.5 5h4.2a1.25 1.25 0 1 1 0 2.5H5.7a.2.2 0 0 0-.2.2v10.6c0 .1.1.2.2.2h10.6a.2.2 0 0 0 .2-.2v-4a1.25 1.25 0 1 1 2.5 0v4.2A2.5 2.5 0 0 1 16.5 21H5.5A2.5 2.5 0 0 1 3 18.5V7.5A2.5 2.5 0 0 1 5.5 5Z"
      />
    </MenuIconBase>
  );
}

function SignOutSolidIcon() {
  return (
    <MenuIconBase>
      <path
        fill="currentColor"
        d="M5.5 3h6A2.5 2.5 0 0 1 14 5.5v2a1.25 1.25 0 1 1-2.5 0v-1.8a.2.2 0 0 0-.2-.2H5.7a.2.2 0 0 0-.2.2v12.6c0 .1.1.2.2.2h5.6a.2.2 0 0 0 .2-.2v-1.8a1.25 1.25 0 1 1 2.5 0v2a2.5 2.5 0 0 1-2.5 2.5h-6A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3Zm11.9 4.6a1.25 1.25 0 0 1 1.77 0l3.4 3.5c.47.49.47 1.31 0 1.8l-3.4 3.5a1.25 1.25 0 0 1-1.8-1.74l1.36-1.41H9.75a1.25 1.25 0 1 1 0-2.5h8.98l-1.36-1.41a1.25 1.25 0 0 1 .03-1.74Z"
      />
    </MenuIconBase>
  );
}

function CheckSolidIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 12.5L9.5 17L19 7"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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

function pickActionIcon(label: ReactNode): ReactNode {
  if (typeof label !== "string") return <GearSolidIcon />;

  const lower = label.toLowerCase();

  if (lower.includes("profile") || lower.includes("account")) return <PersonSolidIcon />;
  if (lower.includes("device")) return <DeviceSolidIcon />;
  if (lower.includes("api") || lower.includes("doc")) return <DocSolidIcon />;
  if (lower.includes("browser") || lower.includes("open")) return <ExternalSolidIcon />;

  return <GearSolidIcon />;
}

/* ------------------------------------------------------------------ */
/* Workspace switcher — Untitled UI style cards at the top of the menu */
/* ------------------------------------------------------------------ */

export type UserMenuWorkspace = {
  id: string;
  name: string;
  domain: string;
  initial: string;
  active?: boolean;
};

const DEFAULT_WORKSPACES: UserMenuWorkspace[] = [
  {
    id: "studio",
    name: "Filmwave Studio",
    domain: "app.filmwave.com",
    initial: "F",
    active: true,
  },
  {
    id: "archive",
    name: "Filmwave Archive",
    domain: "archive.filmwave.com",
    initial: "A",
  },
];

function UserMenuWorkspaces({
  workspaces,
  onSelectWorkspace,
}: {
  workspaces: UserMenuWorkspace[];
  onSelectWorkspace?: (workspace: UserMenuWorkspace) => void;
}) {
  return (
    <div className="filmwave-user-menu-workspaces">
      {workspaces.map((workspace) => (
        <button
          key={workspace.id}
          type="button"
          className={cx(
            "filmwave-user-menu-workspace",
            workspace.active && "is-active",
          )}
          onClick={() => onSelectWorkspace?.(workspace)}
        >
          <span
            className={`filmwave-user-menu-workspace-tile is-${workspace.id}`}
            aria-hidden="true"
          >
            {workspace.initial}
          </span>
          <span className="filmwave-user-menu-workspace-copy">
            <span className="filmwave-user-menu-workspace-name">
              {workspace.name}
            </span>
            <span className="filmwave-user-menu-workspace-domain">
              {workspace.domain}
            </span>
          </span>
          <span
            className={cx(
              "filmwave-user-menu-workspace-check",
              workspace.active && "is-checked",
            )}
            aria-hidden="true"
          >
            {workspace.active && <CheckSolidIcon size={11} />}
          </span>
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel — workspace cards on top, composed content, brand footer      */
/* ------------------------------------------------------------------ */

export function UserMenuPanel({
  children,
  className,
  workspaces = DEFAULT_WORKSPACES,
  onSelectWorkspace,
  footerBrand = "Filmwave",
  footerMeta = `© ${new Date().getFullYear()}`,
}: {
  children: ReactNode;
  className?: string;
  workspaces?: UserMenuWorkspace[];
  onSelectWorkspace?: (workspace: UserMenuWorkspace) => void;
  footerBrand?: ReactNode;
  footerMeta?: ReactNode;
}) {
  return (
    <div className={cx("filmwave-user-menu", className)}>
      {workspaces.length > 0 && (
        <UserMenuWorkspaces
          workspaces={workspaces}
          onSelectWorkspace={onSelectWorkspace}
        />
      )}

      <div className="filmwave-user-menu-body">{children}</div>

      <div className="filmwave-user-menu-footer">
        <span className="filmwave-user-menu-footer-brand">
          <span className="filmwave-user-menu-footer-mark" aria-hidden="true" />
          {footerBrand}
        </span>
        <span className="filmwave-user-menu-footer-meta">{footerMeta}</span>
      </div>
    </div>
  );
}

/* Profile row — replaces the old name/email header block. */
export function UserMenuHeader({
  title,
  detail,
}: {
  title: ReactNode;
  detail: ReactNode;
}) {
  return (
    <div className="filmwave-user-menu-profile">
      <span className="filmwave-user-menu-profile-avatar" aria-hidden="true">
        <PersonSolidIcon />
      </span>
      <span className="filmwave-user-menu-profile-copy">
        <span className="filmwave-user-menu-title">{title}</span>
        <span className="filmwave-user-menu-detail">{detail}</span>
      </span>
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
  icon,
  onClick,
}: {
  as?: ElementType;
  href?: string;
  label: ReactNode;
  helper: ReactNode;
  icon?: ReactNode;
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
      <span className="filmwave-user-menu-action-icon" aria-hidden="true">
        {icon ?? pickActionIcon(label)}
      </span>

      <span className="filmwave-user-menu-action-copy">
        <span className="filmwave-user-menu-action-title">{label}</span>
        <span className="filmwave-user-menu-action-helper">{helper}</span>
      </span>

      <span className="filmwave-user-menu-action-arrow" aria-hidden="true">
        <UserMenuArrowIcon />
      </span>
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
      <span className="filmwave-user-menu-exit-main">
        <span className="filmwave-user-menu-action-icon" aria-hidden="true">
          <SignOutSolidIcon />
        </span>
        <span>{label}</span>
      </span>
      <span className="filmwave-user-menu-exit-trailing">{trailing}</span>
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
