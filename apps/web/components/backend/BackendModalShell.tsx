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
  maxWidth = "max-w-[540px]",
  maxHeight = "560px",
  heightClassName = "h-[560px]",
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
      inputCorners="rounded"
      contentCorners="rounded"
      background="var(--bg-primary)"
      bodyClassName={`flex min-h-0 flex-1 flex-col px-5 pb-0${bodyClassName ? ` ${bodyClassName}` : ""}`}
      contentClassName={`${heightClassName} max-h-[calc(100vh-64px)] [&>div:first-of-type>h2]:text-base [&>div:first-of-type>h2]:font-medium [&>div:first-of-type>h2]:tracking-[-0.03em]`}
      footerClassName="justify-end [&>button]:rounded-[7px]"
      footer={footer}
    >
      {children}
    </ModalShell>
  );
}
