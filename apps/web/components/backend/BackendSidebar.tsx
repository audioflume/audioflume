"use client";

import type { ReactNode } from "react";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type BackendSidebarShellProps = {
  children: ReactNode;
  className?: string;
};

export function BackendSidebarShell({
  children,
  className = "",
}: BackendSidebarShellProps) {
  return (
    <aside
      className={joinClasses(
        "fixed left-0 z-30 hidden w-[var(--admin-sidebar-width)] border-r border-[var(--border)] bg-[var(--bg-primary)] md:flex md:flex-col",
        className,
      )}
      style={{ top: "var(--filmwave-header-height)", bottom: "0px" }}
    >
      {children}
    </aside>
  );
}

type BackendSidebarScrollAreaProps = {
  children: ReactNode;
  className?: string;
};

export function BackendSidebarScrollArea({
  children,
  className = "",
}: BackendSidebarScrollAreaProps) {
  return (
    <div
      className={joinClasses(
        "flex flex-1 flex-col overflow-y-auto px-7 pb-8 pt-8",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function BackendSidebarHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 text-[10px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]">
      {children}
    </div>
  );
}

type BackendSidebarGroupProps = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
};

export function BackendSidebarGroup({
  title,
  children,
  className = "",
}: BackendSidebarGroupProps) {
  return (
    <div className={joinClasses("shrink-0", className)}>
      <BackendSidebarHeading>{title}</BackendSidebarHeading>
      <div className="flex flex-col gap-px">{children}</div>
    </div>
  );
}

type BackendSidebarNavItemProps = {
  children: ReactNode;
  active?: boolean;
  className?: string;
  onClick?: () => void;
};

export function BackendSidebarNavItem({
  children,
  active = false,
  className = "",
  onClick,
}: BackendSidebarNavItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={joinClasses(
        "flex h-[38px] w-full items-center px-3 text-left text-xs transition-colors",
        active
          ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
        className,
      )}
    >
      {children}
    </button>
  );
}
