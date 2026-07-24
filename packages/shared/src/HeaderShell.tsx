import type { HTMLAttributes, ReactNode } from "react";

type HeaderDragSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  "data-tauri-drag-region"?: boolean | string;
};

type HeaderShellProps = {
  logo: ReactNode;
  actions: ReactNode;
  className?: string;
  innerClassName?: string;
  dragSurfaceProps?: HeaderDragSurfaceProps;
  onPointerDownCapture?: HTMLAttributes<HTMLElement>["onPointerDownCapture"];
};

export function HeaderChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={`filmwave-header-chevron${open ? " is-open" : ""}`}
    >
      <path
        d="M7 10L12 15L17 10"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function HeaderShell({
  logo,
  actions,
  className = "",
  innerClassName = "",
  dragSurfaceProps,
  onPointerDownCapture,
}: HeaderShellProps) {
  const { className: dragSurfaceClassName = "", ...restDragSurfaceProps } =
    dragSurfaceProps ?? {};

  return (
    <>
      <style>{`
        html body .filmwave-header .filmwave-header-nav .filmwave-header-nav-link {
          font-size: 12px !important;
        }
      `}</style>

      <header
        className={`filmwave-header${className ? ` ${className}` : ""}`}
        onPointerDownCapture={onPointerDownCapture}
      >
        <div
          className={`filmwave-header-inner${innerClassName ? ` ${innerClassName}` : ""}`}
        >
          <div className="filmwave-header-logo-slot">{logo}</div>
          <div
            className={`filmwave-header-drag-surface${
              dragSurfaceClassName ? ` ${dragSurfaceClassName}` : ""
            }`}
            {...restDragSurfaceProps}
          />
          <div className="filmwave-header-actions">{actions}</div>
        </div>
      </header>
    </>
  );
}
