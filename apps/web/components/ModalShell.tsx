"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePlayer } from "@/context/PlayerContext";

type ModalShellProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  closeLabel?: string;
  centerTitle?: boolean;
  bodyScroll?: boolean;
  bodyClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  headerContent?: ReactNode;
  inputCorners?: "square" | "rounded";
  contentCorners?: "square" | "rounded";
  background?: string;
  eyebrow?: string;
  headerHeight?: string;
  bodyOverflow?: "hidden" | "visible";
};

export default function ModalShell({
  isOpen,
  title,
  onClose,
  children,
  footer,
  maxWidth = "max-w-[600px]",
  maxHeight = "506px",
  closeLabel = "Close modal",
  centerTitle = true,
  bodyScroll = false,
  bodyClassName,
  contentClassName = "",
  footerClassName = "",
  headerContent,
  inputCorners = "square",
  contentCorners = "square",
  background = "var(--bg-primary)",
  eyebrow = "",
  headerHeight = "96px",
  bodyOverflow = "visible",
}: ModalShellProps) {
  const { currentSong } = usePlayer();
  const playerVisible = !!currentSong;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  const modalMaxHeight = playerVisible
    ? `min(${maxHeight}, calc(100vh - 128px))`
    : `min(${maxHeight}, calc(100vh - 64px))`;

  const defaultBodyClassName = footer ? "px-5 pb-2" : "px-5 pb-5";
  const inputCornerClassName =
    inputCorners === "rounded"
      ? "[&_input:not([type=file])]:rounded-[7px]"
      : "[&_input:not([type=file])]:rounded-none";
  const contentCornerClassName =
    contentCorners === "rounded" ? "rounded-[4px]" : "rounded-none";

  const modal = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[var(--modal-backdrop)] px-4"
      style={{
        paddingTop: "32px",
        paddingBottom: playerVisible ? "96px" : "32px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative my-auto flex w-full ${maxWidth} flex-col overflow-hidden ${contentCornerClassName} border-0 ${contentClassName}`}
        style={{
          maxHeight: modalMaxHeight,
          background,
          boxShadow: "0 28px 80px rgba(0, 0, 0, 0.24)",
        }}
      >
        <div
          className={
            headerContent
              ? "flex h-[60px] flex-shrink-0 items-center px-5 pr-14"
              : `flex flex-shrink-0 flex-col justify-center px-6 pr-16 ${
                  centerTitle ? "items-center text-center" : "items-start text-left"
                }`
          }
          style={headerContent ? undefined : { height: headerHeight }}
        >
          {headerContent || (
            <>
              {eyebrow && (
                <span className="mb-2 font-[family-name:var(--font-roboto-mono-filmwave)] text-[9px] font-normal uppercase tracking-[0.08em] text-[var(--text-muted)]">
                  {eyebrow}
                </span>
              )}
              <h2
                className={`min-w-0 font-[family-name:var(--font-aktiv-grotesk)] text-[28px] font-light leading-none tracking-[-0.035em] text-[var(--text-primary)] ${
                  centerTitle
                    ? "absolute left-1/2 -translate-x-1/2 whitespace-nowrap"
                    : ""
                }`}
              >
                {title}
              </h2>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border-0 bg-[var(--bg-tertiary)] p-0 text-[var(--text-secondary)] transition duration-150 hover:scale-[1.03] hover:bg-[#d8d8d8]"
          aria-label={closeLabel}
        >
          <svg width="15" height="15" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="m2.25 2.25 7.5 7.5M9.75 2.25l-7.5 7.5"
              stroke="currentColor"
              strokeWidth="0.9"
            />
          </svg>
        </button>

        <div
          className={`min-h-0 flex-1 ${bodyClassName ?? defaultBodyClassName} ${
            bodyScroll
              ? "overflow-y-auto"
              : bodyOverflow === "visible"
                ? "overflow-visible"
                : "overflow-hidden"
          } [&_label]:text-[var(--text-secondary)] ${inputCornerClassName} [&_input:not([type=file])]:border-[var(--border)] [&_input:not([type=file])]:bg-[var(--filmwave-menu-bg)] [&_input:not([type=file])]:outline-none [&_input:not([type=file])]:focus:border-[var(--border)] [&_textarea]:rounded-none [&_textarea]:border-[var(--border)] [&_textarea]:bg-[var(--filmwave-menu-bg)] [&_textarea]:outline-none [&_textarea]:focus:border-[var(--border)]`}
        >
          {children}
        </div>

        {footer && (
          <div
            className={`flex flex-shrink-0 items-center gap-2 px-5 pb-5 pt-2 ${
              footerClassName || "justify-end"
            } [&>button]:rounded-[7px]`}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
