import type { ReactNode } from "react";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function BackendMediaThumbnail({
  src,
  alt = "",
  size = 52,
  fallback,
  className = "",
}: {
  src?: string | null;
  alt?: string;
  size?: number;
  fallback?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={joinClasses(
        "shrink-0 overflow-hidden bg-[var(--bg-tertiary)]",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      ) : (
        fallback ?? null
      )}
    </div>
  );
}

export function BackendRowTitle({
  children,
  secondary,
}: {
  children: ReactNode;
  secondary?: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="truncate text-xs font-[320] leading-tight text-[var(--text-primary)]">
        {children}
      </div>
      {secondary ? (
        <div className="mt-1 text-[11px] font-[320] text-[var(--text-muted)]">{secondary}</div>
      ) : null}
    </div>
  );
}

export function BackendRowActions({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>;
}
