"use client";

import Link from "next/link";
import type { ReactNode } from "react";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type BackendSidebarShellProps = {
  children: ReactNode;
  className?: string;
  bottom?: string;
};

export function BackendSidebarShell({
  children,
  className = "",
  bottom = "0px",
}: BackendSidebarShellProps) {
  return (
    <aside
      className={joinClasses(
        "fixed left-0 z-30 hidden w-[var(--admin-sidebar-width)] border-r border-[var(--border)] bg-[var(--bg-primary)] md:flex md:flex-col",
        className,
      )}
      style={{ top: "var(--filmwave-header-height)", bottom }}
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
    <div className="mb-[17px] px-3 font-[family-name:var(--font-aktiv-grotesk)] text-[11px] font-medium uppercase leading-none tracking-[0.02em] text-[var(--text-primary)]">
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
  href: string;
  children: ReactNode;
  active?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
  onClick?: () => void;
};

export function BackendSidebarNavItem({
  href,
  children,
  active = false,
  leading,
  trailing,
  className = "",
  onClick,
}: BackendSidebarNavItemProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={joinClasses(
        "group flex h-[38px] w-full items-center gap-2.5 pl-3 pr-2 text-left text-[12.5px] font-normal transition-colors focus-visible:bg-[var(--bg-hover)] focus-visible:text-[var(--text-primary)] focus-visible:outline-none",
        active
          ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
          : "text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]",
        className,
      )}
    >
      {leading ? (
        <span
          className={joinClasses(
            "flex h-4 w-4 shrink-0 items-center justify-center transition-colors",
            active
              ? "text-[var(--text-primary)]"
              : "text-[var(--text-muted)] group-hover:text-[var(--text-primary)] group-focus-visible:text-[var(--text-primary)]",
          )}
        >
          {leading}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing ? <span className="ml-auto shrink-0">{trailing}</span> : null}
    </Link>
  );
}
