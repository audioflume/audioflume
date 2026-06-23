"use client";

import type { CSSProperties, ReactNode } from "react";

export type SidebarTooltipState = {
  label: string;
  top: number;
} | null;

type SidebarShellProps = {
  collapsed: boolean;
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  tooltip?: SidebarTooltipState;
  main?: ReactNode;
  className?: string;
  sidebarClassName?: string;
  sidebarStyle?: CSSProperties;
  mainClassName?: string;
};

export function SidebarShell({
  collapsed,
  children,
  header,
  footer,
  tooltip,
  main,
  className = "desktop-app-shell",
  sidebarClassName = "desktop-app-sidebar",
  sidebarStyle,
  mainClassName = "desktop-app-main",
}: SidebarShellProps) {
  return (
    <div className={`${className}${collapsed ? " is-sidebar-collapsed" : ""}`}>
      {header}
      <aside className={sidebarClassName} style={sidebarStyle} data-sidebar data-tauri-drag-region>
        {children}
        {footer && <div className="desktop-sidebar-footer">{footer}</div>}
      </aside>
      {tooltip && <SidebarTooltip label={tooltip.label} top={tooltip.top} />}
      {main !== undefined && <main className={mainClassName}>{main}</main>}
    </div>
  );
}

type SidebarCollapseControlProps = {
  collapsed: boolean;
  onToggle: () => void;
  icon: ReactNode;
  expandLabel?: string;
  collapseLabel?: string;
};

export function SidebarCollapseControl({
  collapsed,
  onToggle,
  icon,
  expandLabel = "Expand sidebar",
  collapseLabel = "Collapse sidebar",
}: SidebarCollapseControlProps) {
  return (
    <div className="desktop-sidebar-collapse-zone">
      <div className="desktop-sidebar-collapse-zone-inner">
        <button
          type="button"
          className="desktop-sidebar-collapse-button"
          aria-label={collapsed ? expandLabel : collapseLabel}
          onClick={onToggle}
        >
          {icon}
        </button>
      </div>
    </div>
  );
}

export function SidebarInner({ children }: { children: ReactNode }) {
  return <div className="desktop-app-sidebar-inner">{children}</div>;
}

type SidebarSectionProps = {
  children: ReactNode;
  projects?: boolean;
};

export function SidebarSection({ children, projects = false }: SidebarSectionProps) {
  return (
    <div className={`desktop-sidebar-section${projects ? " is-projects-section" : ""}`}>
      {children}
    </div>
  );
}

type SidebarSectionHeadingProps = {
  label: string;
  collapsed: boolean;
  icon: ReactNode;
};

export function SidebarSectionHeading({ label, collapsed, icon }: SidebarSectionHeadingProps) {
  return (
    <div className="desktop-sidebar-heading">
      <div className="desktop-sidebar-heading-inner">
        <span className="desktop-sidebar-heading-label">{label}</span>
        <span
          className={`desktop-sidebar-heading-icon${collapsed ? " is-visible" : ""}`}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

export function SidebarNav({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <nav className="desktop-sidebar-nav" aria-label={label}>
      {children}
    </nav>
  );
}

function SidebarCuratedPlaylistsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4.6 2.6H10.7C11.5 2.6 12.1 3.2 12.1 4V9.8"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.48"
      />
      <path
        d="M3.3 4.3H9.4C10.2 4.3 10.8 4.9 10.8 5.7V11.4C10.8 12.2 10.2 12.8 9.4 12.8H3.3C2.5 12.8 1.9 12.2 1.9 11.4V5.7C1.9 4.9 2.5 4.3 3.3 4.3Z"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinejoin="round"
      />
      <path
        d="M4.35 7H8.35M4.35 8.75H8.85M4.35 10.5H7.1"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M12.7 5.4V8.35M11.25 6.85H14.15"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

type SidebarLinkRowProps = {
  label: string;
  icon: ReactNode;
  active?: boolean;
  collapsed: boolean;
  onClick?: () => void;
  onTooltipChange: (tooltip: SidebarTooltipState) => void;
};

export function SidebarLinkRow({
  label,
  icon,
  active = false,
  collapsed,
  onClick,
  onTooltipChange,
}: SidebarLinkRowProps) {
  const renderedIcon =
    label === "Curated Playlists" ? <SidebarCuratedPlaylistsIcon /> : icon;

  function showTooltip(element: HTMLElement) {
    if (!collapsed) return;
    const rect = element.getBoundingClientRect();
    onTooltipChange({ label, top: rect.top + rect.height / 2 });
  }

  return (
    <button
      type="button"
      className={`desktop-sidebar-link${active ? " is-active" : ""}`}
      aria-label={label}
      onMouseEnter={(event) => showTooltip(event.currentTarget)}
      onMouseLeave={() => onTooltipChange(null)}
      onFocus={(event) => showTooltip(event.currentTarget)}
      onBlur={() => onTooltipChange(null)}
      onClick={() => {
        onTooltipChange(null);
        onClick?.();
      }}
    >
      <span className="desktop-sidebar-link-icon" aria-hidden="true">
        {renderedIcon}
      </span>
      <span className="desktop-sidebar-link-label">{label}</span>
    </button>
  );
}

type SidebarProjectsHeaderProps = {
  label: string;
  collapsed: boolean;
  actionLabel: string;
  actionIcon: ReactNode;
  onActionClick: () => void;
  onTooltipChange: (tooltip: SidebarTooltipState) => void;
  beforeAction?: ReactNode;
};

export function SidebarProjectsHeader({
  label,
  collapsed,
  actionLabel,
  actionIcon,
  onActionClick,
  onTooltipChange,
  beforeAction,
}: SidebarProjectsHeaderProps) {
  function showTooltip(element: HTMLElement) {
    if (!collapsed) return;
    const rect = element.getBoundingClientRect();
    onTooltipChange({ label: actionLabel, top: rect.top + rect.height / 2 });
  }

  return (
    <div className="desktop-sidebar-projects-head">
      <span className="desktop-sidebar-projects-label">{label}</span>
      <div className="desktop-sidebar-project-actions">
        {beforeAction}
        <button
          type="button"
          className="desktop-sidebar-add-button"
          aria-label={actionLabel}
          onMouseEnter={(event) => showTooltip(event.currentTarget)}
          onMouseLeave={() => onTooltipChange(null)}
          onFocus={(event) => showTooltip(event.currentTarget)}
          onBlur={() => onTooltipChange(null)}
          onClick={() => {
            onTooltipChange(null);
            onActionClick();
          }}
        >
          {actionIcon}
        </button>
      </div>
    </div>
  );
}

export function SidebarEmptyState({ children }: { children: ReactNode }) {
  return <div className="desktop-sidebar-empty-projects">{children}</div>;
}

export function SidebarTooltip({
  label,
  top,
  style,
}: {
  label: string;
  top: number;
  style?: CSSProperties;
}) {
  return (
    <div className="desktop-sidebar-tooltip" style={{ top, ...style }}>
      <div className="desktop-sidebar-tooltip-border">
        <div className="desktop-sidebar-tooltip-inner">{label}</div>
      </div>
    </div>
  );
}
