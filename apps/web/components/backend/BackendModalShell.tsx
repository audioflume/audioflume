"use client";

import type { ReactNode } from "react";
import ModalShell from "@/components/ModalShell";

type BackendModalShellProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  closeLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: string;
  maxHeight?: string;
  heightClassName?: string;
  bodyClassName?: string;
};

export default function BackendModalShell({
  isOpen,
  title,
  onClose,
  closeLabel = "Close modal",
  children,
  footer,
  maxWidth = "max-w-[600px]",
  maxHeight = "506px",
  heightClassName = "h-[506px]",
  bodyClassName = "",
}: BackendModalShellProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      closeLabel={closeLabel}
      maxWidth={maxWidth}
      maxHeight={maxHeight}
      centerTitle
      bodyOverflow="hidden"
      background="var(--bg-primary)"
      bodyClassName={`flex min-h-0 flex-1 flex-col px-5 pb-0${bodyClassName ? ` ${bodyClassName}` : ""}`}
      contentClassName={`${heightClassName} max-h-[calc(100vh-64px)]`}
      footerClassName="justify-end"
      footer={footer}
    >
      {children}
    </ModalShell>
  );
}
