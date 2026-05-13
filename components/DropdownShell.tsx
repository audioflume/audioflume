"use client";

import {
  ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import {
  FloatingPortal,
  Padding,
  Placement,
  Strategy,
} from "@floating-ui/react";

type DropdownShellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: (props: { open: boolean }) => ReactNode;
  children: ReactNode;
  placement?: Placement;
  className?: string;
  collisionPadding?: Padding;
  offsetAmount?: number;
  flippedOffsetAmount?: number;
  crossAxisOffset?: number;
  strategy?: Strategy;
  usePortal?: boolean;
};

type FrozenSide = "top" | "bottom";

type Anchor = {
  top: number;
  bottom: number;
  left: number;
  right: number;
  width: number;
};

function getViewportHeight() {
  return window.visualViewport?.height ?? window.innerHeight;
}

function getViewportWidth() {
  return window.visualViewport?.width ?? window.innerWidth;
}

function getPaddingValue(
  padding: Padding,
  side: "top" | "right" | "bottom" | "left",
) {
  if (typeof padding === "number") return padding;

  return padding?.[side] ?? 0;
}

function getPlacementParts(placement: Placement) {
  const [side, align] = placement.split("-") as [
    string,
    "start" | "end" | undefined,
  ];

  return { side, align };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function DropdownShell({
  open,
  onOpenChange,
  trigger,
  children,
  placement = "bottom-end",
  className = "",
  collisionPadding = {
    top: 72,
    right: 16,
    bottom: 88,
    left: 16,
  },
  offsetAmount = 8,
  flippedOffsetAmount = offsetAmount,
  crossAxisOffset = 0,
  strategy: _strategy = "fixed",
  usePortal = true,
}: DropdownShellProps) {
  const referenceRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<Anchor | null>(null);
  const frozenSideRef = useRef<FrozenSide>("bottom");
  const frameRef = useRef<number | null>(null);

  const measureAnchor = useCallback(() => {
    const reference = referenceRef.current;

    if (!reference) return null;

    const rect = reference.getBoundingClientRect();

    const anchor = {
      top: rect.top + window.scrollY,
      bottom: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
      right: rect.right + window.scrollX,
      width: rect.width,
    };

    anchorRef.current = anchor;

    return anchor;
  }, []);

  const chooseSide = useCallback(
    (anchor: Anchor, floatingHeight: number): FrozenSide => {
      const preferredSide = getPlacementParts(placement).side;

      const topPadding = getPaddingValue(collisionPadding, "top");
      const bottomPadding = getPaddingValue(collisionPadding, "bottom");
      const viewportHeight = getViewportHeight();

      const triggerTop = anchor.top - window.scrollY;
      const triggerBottom = anchor.bottom - window.scrollY;

      const availableAbove = triggerTop - topPadding;
      const availableBelow = viewportHeight - bottomPadding - triggerBottom;

      if (preferredSide === "top") {
        if (availableAbove >= floatingHeight + flippedOffsetAmount) {
          return "top";
        }

        if (availableBelow > availableAbove) return "bottom";

        return "top";
      }

      if (availableBelow >= floatingHeight + offsetAmount) return "bottom";
      if (availableAbove > availableBelow) return "top";

      return "bottom";
    },
    [placement, collisionPadding, flippedOffsetAmount, offsetAmount],
  );

  const updateFloatingPosition = useCallback(
    ({ refreeze = false }: { refreeze?: boolean } = {}) => {
      const floating = floatingRef.current;

      if (!floating) return;

      const anchor = refreeze ? measureAnchor() : anchorRef.current;

      if (!anchor) return;

      const floatingRect = floating.getBoundingClientRect();
      const floatingWidth = floatingRect.width;
      const floatingHeight = floatingRect.height;

      if (refreeze) {
        frozenSideRef.current = chooseSide(anchor, floatingHeight);
      }

      const side = frozenSideRef.current;
      const { align } = getPlacementParts(placement);

      const topPadding = getPaddingValue(collisionPadding, "top");
      const rightPadding = getPaddingValue(collisionPadding, "right");
      const bottomPadding = getPaddingValue(collisionPadding, "bottom");
      const leftPadding = getPaddingValue(collisionPadding, "left");

      const viewportWidth = getViewportWidth();
      const viewportHeight = getViewportHeight();

      const triggerTop = anchor.top - window.scrollY;
      const triggerBottom = anchor.bottom - window.scrollY;
      const triggerLeft = anchor.left - window.scrollX;
      const triggerRight = anchor.right - window.scrollX;

      const naturalTop =
        side === "top"
          ? triggerTop - floatingHeight - flippedOffsetAmount
          : triggerBottom + offsetAmount;

      const naturalLeft =
        align === "start"
          ? triggerLeft + crossAxisOffset
          : align === "end"
            ? triggerRight - floatingWidth + crossAxisOffset
            : triggerLeft +
              anchor.width / 2 -
              floatingWidth / 2 +
              crossAxisOffset;

      const minTop = topPadding;
      const maxTop = Math.max(
        topPadding,
        viewportHeight - bottomPadding - floatingHeight,
      );

      const minLeft = leftPadding;
      const maxLeft = Math.max(
        leftPadding,
        viewportWidth - rightPadding - floatingWidth,
      );

      const x = Math.round(clamp(naturalLeft, minLeft, maxLeft));
      const y = Math.round(clamp(naturalTop, minTop, maxTop));
      const maxHeight = Math.max(
        120,
        viewportHeight - topPadding - bottomPadding,
      );

      floating.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      floating.style.maxHeight = `${maxHeight}px`;
      floating.style.visibility = "visible";
    },
    [
      measureAnchor,
      chooseSide,
      placement,
      collisionPadding,
      offsetAmount,
      flippedOffsetAmount,
      crossAxisOffset,
    ],
  );

  const schedulePositionUpdate = useCallback(
    ({ refreeze = false }: { refreeze?: boolean } = {}) => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }

      frameRef.current = window.requestAnimationFrame(() => {
        updateFloatingPosition({ refreeze });
        frameRef.current = null;
      });
    },
    [updateFloatingPosition],
  );

  useLayoutEffect(() => {
    if (!open) {
      anchorRef.current = null;

      if (floatingRef.current) {
        floatingRef.current.style.visibility = "hidden";
      }

      return;
    }

    if (floatingRef.current) {
      floatingRef.current.style.visibility = "hidden";
      floatingRef.current.style.transform = "translate3d(0px, 0px, 0)";
    }

    const firstFrame = window.requestAnimationFrame(() => {
      updateFloatingPosition({ refreeze: true });

      const secondFrame = window.requestAnimationFrame(() => {
        updateFloatingPosition({ refreeze: true });
      });

      frameRef.current = secondFrame;
    });

    frameRef.current = firstFrame;

    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, [open, updateFloatingPosition]);

  useEffect(() => {
    if (!open) return;

    function handleScroll() {
      updateFloatingPosition({ refreeze: false });
    }

    function handleResize() {
      schedulePositionUpdate({ refreeze: true });
    }

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);
    window.visualViewport?.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, [open, schedulePositionUpdate, updateFloatingPosition]);

  useEffect(() => {
    if (!open) return;

    const floating = floatingRef.current;

    if (!floating) return;

    const observer = new ResizeObserver(() => {
      schedulePositionUpdate({ refreeze: false });
    });

    observer.observe(floating);

    return () => {
      observer.disconnect();
    };
  }, [open, schedulePositionUpdate]);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (referenceRef.current?.contains(target)) return;
      if (floatingRef.current?.contains(target)) return;

      onOpenChange(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    return () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  const dropdown = (
    <div
      ref={floatingRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        transform: "translate3d(0px, 0px, 0)",
        visibility: "hidden",
      }}
      className={`filmwave-dropdown-shell ${className}`}
      data-placement={frozenSideRef.current}
      onClick={(event) => {
        event.stopPropagation();
      }}
    >
      {children}
    </div>
  );

  return (
    <>
      <style>{`
        .filmwave-dropdown-shell {
          z-index: 160;
          width: max-content;
          min-width: 180px;
          max-width: calc(100vw - 32px);
          overflow-y: auto;
          overflow-x: hidden;
          border-radius: 14px;
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--bg-primary) 92%, transparent);
          box-shadow: var(--shadow-ui);
          backdrop-filter: blur(18px);
          padding: 6px;
          color: var(--text-primary);
          overscroll-behavior: contain;
          will-change: transform;
        }

        .filmwave-dropdown-shell::-webkit-scrollbar {
          width: 8px;
        }

        .filmwave-dropdown-shell::-webkit-scrollbar-track {
          background: transparent;
        }

        .filmwave-dropdown-shell::-webkit-scrollbar-thumb {
          border-radius: 999px;
          background: color-mix(in srgb, var(--text-primary) 14%, transparent);
          border: 2px solid transparent;
          background-clip: padding-box;
        }

        .filmwave-dropdown-shell button,
        .filmwave-dropdown-shell a {
          display: flex;
          min-height: 38px;
          width: 100%;
          cursor: pointer;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          padding: 0 12px;
          text-align: left;
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          transition:
            background 0.15s ease,
            color 0.15s ease,
            opacity 0.15s ease;
          text-decoration: none;
          white-space: nowrap;
        }

        .filmwave-dropdown-shell button:hover,
        .filmwave-dropdown-shell a:hover {
          background: var(--bg-hover-strong);
          color: var(--text-primary);
        }

        .filmwave-dropdown-shell button:disabled {
          cursor: default;
          opacity: 0.45;
        }

        .filmwave-dropdown-shell button:disabled:hover {
          background: transparent;
          color: var(--text-secondary);
        }

        .filmwave-dropdown-shell button.danger,
        .filmwave-dropdown-shell a.danger {
          color: var(--danger);
        }

        .filmwave-dropdown-shell button.danger:hover,
        .filmwave-dropdown-shell a.danger:hover {
          color: var(--danger);
        }

        .filmwave-dropdown-shell .dropdown-divider {
          height: 1px;
          margin: 6px 4px;
          background: var(--border-subtle);
        }

        .light .filmwave-dropdown-shell {
          background: color-mix(in srgb, var(--bg-primary) 96%, transparent);
        }
      `}</style>

      <div
        ref={referenceRef}
        style={{
          display: "inline-flex",
          width: "fit-content",
        }}
        onClick={(event) => {
          event.stopPropagation();
          onOpenChange(!open);
        }}
      >
        {trigger({ open })}
      </div>

      {open &&
        (usePortal ? <FloatingPortal>{dropdown}</FloatingPortal> : dropdown)}
    </>
  );
}
