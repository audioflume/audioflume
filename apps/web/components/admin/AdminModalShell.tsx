"use client";

import type { ReactNode } from "react";
import ModalShell from "@/components/ModalShell";

type AdminModalShellProps = {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  closeLabel?: string;
  children: ReactNode;
  footer?: ReactNode;
};

export default function AdminModalShell({
  isOpen,
  title,
  onClose,
  closeLabel = "Close modal",
  children,
  footer,
}: AdminModalShellProps) {
  return (
    <ModalShell
      isOpen={isOpen}
      title={title}
      onClose={onClose}
      closeLabel={closeLabel}
      maxWidth="max-w-[540px]"
      maxHeight="560px"
      centerTitle
      inputCorners="rounded"
      bodyClassName="flex min-h-0 flex-1 flex-col px-5 pb-0"
      contentClassName="h-[560px] max-h-[calc(100vh-64px)] !rounded-[10px] [&>div:first-of-type>h2]:!text-base [&>div:first-of-type>h2]:!font-medium [&>div:first-of-type>h2]:!tracking-[-0.03em]"
      footerClassName="justify-end"
      footer={footer}
    >
      {children}
    </ModalShell>
  );
}
