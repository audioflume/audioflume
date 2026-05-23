"use client";

import { ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePlayer } from "@/context/PlayerContext";
import {
  modalTitleClass,
  modalIconCloseButtonClass,
} from "@/components/uiClasses";

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
      className="fixed inset-0 z-[200] flex items-center justify-center overflow-y-auto bg-[var(--modal-backdrop)] px-4 backdrop-blur-[10px]"
      style={{
        paddingTop: "32px",
        paddingBottom: playerVisible ? "96px" : "32px",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative my-auto flex w-full ${maxWidth} flex-col overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] shadow-[0_28px_90px_rgba(0,0,0,0.42)] ${contentClassName}`}
        style={{
          maxHeight: modalMaxHeight,
        }}
      >
        <div
          className={
            centerTitle
              ? "flex h-16 flex-shrink-0 items-center justify-center px-14 pt-1"
              : "flex h-16 flex-shrink-0 items-center px-5 pr-14 pt-1"
          }
        >
          <h2 className={`${modalTitleClass} text-[18px] tracking-[-0.025em]`}>{title}</h2>
        </div>

        <button
          type="button"
          onClick={onClose}
          className={`${modalIconCloseButtonClass} absolute right-4 top-4 z-10`}
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
              className={`min-h-0 flex-1 px-5 pb-4 ${
                bodyScroll ? "overflow-y-auto" : "overflow-hidden"
              } ${bodyClassName}`}
            >
              {children}
            </div>

            <div className="flex flex-shrink-0 items-center justify-end gap-2 px-5 pb-5 pt-1">
              {footer}
            </div>
          </>
        ) : (
          <div className={`px-5 pb-5 ${contentClassName}`}>{children}</div>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
