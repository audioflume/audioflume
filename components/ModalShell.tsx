"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePlayer } from "@/context/PlayerContext";
import { modalTitleClass } from "@/components/uiClasses";

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
  centerTitle = false,
  bodyScroll = false,
  bodyClassName,
  contentClassName = "",
  footerClassName = "",
  headerContent,
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

  const defaultBodyClassName = footer
    ? "px-5 pb-2"
    : "px-5 pb-5";

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
        className={`relative my-auto flex w-full ${maxWidth} flex-col overflow-hidden rounded-none border-0 bg-[var(--bg-primary)] shadow-none ${contentClassName}`}
        style={{
          maxHeight: modalMaxHeight,
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
            <h2 className={`${modalTitleClass} text-[22px] tracking-[-0.04em]`}>{title}</h2>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-none border-0 bg-transparent p-0 text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]"
          aria-label={closeLabel}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        <div
          className={`min-h-0 flex-1 ${bodyClassName ?? defaultBodyClassName} ${
            bodyScroll ? "overflow-y-auto" : "overflow-hidden"
          }`}
        >
          {children}
        </div>

        {footer && (
          <div className={`flex flex-shrink-0 items-center gap-2 px-5 pb-5 pt-2 ${footerClassName || "justify-end"}`}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
