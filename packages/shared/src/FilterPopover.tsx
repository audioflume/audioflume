import { useLayoutEffect, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

const EDGE_PADDING = 12;
const DROPDOWN_TOP_OFFSET = 8;

function getLeftLimit() {
  if (typeof document === "undefined") return EDGE_PADDING;

  const sidebar = document.querySelector<HTMLElement>(
    'aside[data-sidebar], .desktop-app-sidebar',
  );
  const rect = sidebar?.getBoundingClientRect();

  if (!rect || rect.width <= 0) return EDGE_PADDING;

  return Math.max(EDGE_PADDING, rect.right + EDGE_PADDING);
}

export type FilterPopoverProps = {
  open: boolean;
  triggerRef: RefObject<HTMLElement | null>;
  width?: number;
  className?: string;
  children: ReactNode;
};

export function FilterPopover({
  open,
  triggerRef,
  width = 280,
  className = "",
  children,
}: FilterPopoverProps) {
  const [position, setPosition] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!open) return;

    function updatePosition() {
      const trigger = triggerRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const leftLimit = getLeftLimit();
      const rightLimit = window.innerWidth - EDGE_PADDING;
      const availableWidth = Math.max(180, rightLimit - leftLimit);
      const dropdownWidth = Math.min(width, availableWidth);
      const maxLeft = rightLimit - dropdownWidth;
      const left = Math.max(leftLimit, Math.min(rect.left, maxLeft));
      const top = rect.bottom + DROPDOWN_TOP_OFFSET;

      setPosition({ left, top, width: dropdownWidth });
    }

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, triggerRef, width]);

  if (!open || !position) return null;

  return createPortal(
    <div
      className={`filmwave-filter-popover${className ? ` ${className}` : ""}`}
      style={{
        left: `${position.left}px`,
        top: `${position.top}px`,
        width: `${position.width}px`,
      }}
      onMouseDown={(event) => event.stopPropagation()}
    >
      {children}
    </div>,
    document.body,
  );
}
