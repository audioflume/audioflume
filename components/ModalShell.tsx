"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePlayer } from "@/context/PlayerContext";
import { dangerButtonClass, iconButtonClass } from "@/components/uiClasses";

export const modalTitleClass =
  "min-w-0 font-[family-name:var(--font-instrument-sans)] text-[15px] font-medium tracking-[-0.01em] text-[var(--text-primary)]";

export const modalFieldLabelClass =
  "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--text-muted)]";

export const modalInputClass =
  "h-9 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-secondary)] disabled:cursor-default disabled:opacity-70";

export const modalTextareaClass =
  "w-full resize-none rounded-lg border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--text-secondary)] disabled:cursor-default disabled:opacity-70";

export const modalCoverButtonClass =
  "h-8 cursor-pointer rounded-md border border-[var(--border)] px-3.5 text-xs font-medium text-[var(--text-secondary)] transition hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] disabled:cursor-default disabled:opacity-70";

export const modalActionButtonClass =
  "flex h-8 cursor-pointer items-center justify-center rounded-md px-3.5 text-xs font-medium transition disabled:cursor-default disabled:opacity-70";

export const modalCancelButtonClass = `${modalActionButtonClass} text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]`;

export const modalPrimaryButtonClass = `${modalActionButtonClass} font-[family-name:var(--font-instrument-sans)] min-w-[104px] bg-[var(--text-primary)] font-semibold text-[var(--bg-primary)] hover:opacity-80`;

export const modalDeleteButtonClass = `${modalActionButtonClass} ${dangerButtonClass} px-0`;

export const modalIconCloseButtonClass = iconButtonClass;

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
  bodyClassName = "",
  contentClassName = "",
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
        className={`relative my-auto flex w-full ${maxWidth} flex-col overflow-hidden rounded-[14px] border border-[var(--border)] bg-[var(--bg-secondary)] shadow-[var(--shadow-ui)]`}
        style={{
          maxHeight: modalMaxHeight,
        }}
      >
        <div
          className={
            centerTitle
              ? "flex h-11 flex-shrink-0 items-center justify-center border-b border-[var(--border)] px-12"
              : "flex h-11 flex-shrink-0 items-center border-b border-[var(--border)] px-4 pr-12"
          }
        >
          <h2 className={modalTitleClass}>{title}</h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`${modalIconCloseButtonClass} absolute right-2 top-2 z-10`}
          aria-label={closeLabel}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="6" y1="6" x2="18" y2="18" />
            <line x1="18" y1="6" x2="6" y2="18" />
          </svg>
        </button>

        {footer ? (
          <>
            <div
              className={`min-h-0 flex-1 p-4 ${
                bodyScroll ? "overflow-y-auto" : "overflow-hidden"
              } ${bodyClassName}`}
            >
              {children}
            </div>

            <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
              {footer}
            </div>
          </>
        ) : (
          <div className={`p-4 ${contentClassName}`}>{children}</div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
