import type { ButtonHTMLAttributes } from "react";

import DragIconSmall from "@/components/icons/DragIconSmall";

type BackendDragHandleProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type"
> & {
  variant?: "row" | "overlay";
};

const rowClassName =
  "flex h-8 w-7 shrink-0 cursor-grab items-center justify-center text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)] active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50";

const overlayClassName =
  "flex h-8 w-8 shrink-0 cursor-grab items-center justify-center bg-transparent text-white transition active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-50";

export function BackendDragHandleGlyph() {
  return (
    <span className="inline-flex scale-x-[1.45]">
      <DragIconSmall />
    </span>
  );
}

export default function BackendDragHandle({
  variant = "row",
  className = "",
  ...props
}: BackendDragHandleProps) {
  return (
    <button
      type="button"
      className={`${variant === "overlay" ? overlayClassName : rowClassName} ${className}`.trim()}
      {...props}
    >
      <BackendDragHandleGlyph />
    </button>
  );
}
