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
};

export default function ModalShell({
  isOpen,
  title,
  onClose,
  children,
  footer,
  maxWidth = "max-w-[420px]",
  maxHeight = "520px",
  closeLabel = "Close modal",
  centerTitle = true,
  bodyScroll = false,
  bodyClassName,
  contentClassName = "",
  footerClassName = "",
  headerContent,
  inputCorners = "rounded",
  contentCorners = "rounded",
  background = "var(--bg-primary)",
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
    contentCorners === "rounded" ? "rounded-[10px]" : "rounded-none";

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
          boxShadow: "var(--filmwave-menu-shadow)",
        }}
      >
        <div
          className={
            headerContent
              ? "flex h-[60px] flex-shrink-0 items-center px-5 pr-14"
              : centerTitle
                ? "flex h-[60px] flex-shrink-0 items-center justify-center px-14 pt-1"
                : "flex h-[60px] flex-shrink-0 items-center px-5 pr-14 pt-1"
          }
        >
          {headerContent || (
            <h2 className="min-w-0 font-[family-name:var(--font-aktiv-grotesk)] text-base font-medium tracking-[-0.03em] text-[var(--text-primary)]">
              {title}
            </h2>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 inline-flex h-6 w-6 items-center justify-center border-0 bg-transparent p-0 text-[var(--text-muted)] transition-colors duration-150 hover:text-[var(--text-primary)]"
          aria-label={closeLabel}
        >
          <svg width="19" height="19" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="m2.25 2.25 7.5 7.5M9.75 2.25l-7.5 7.5"
              stroke="currentColor"
              strokeWidth="0.9"
            />
          </svg>
        </button>

        <div
          className={`min-h-0 flex-1 ${bodyClassName ?? defaultBodyClassName} ${
            bodyScroll ? "overflow-y-auto" : "overflow-hidden"
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
