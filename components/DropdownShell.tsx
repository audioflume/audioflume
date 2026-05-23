"use client";

import {
  ReactNode,
  type SyntheticEvent,
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
  anchorPoint?: { x: number; y: number } | null;
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
  anchorPoint = null,
}: DropdownShellProps) {
  const referenceRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<Anchor | null>(null);
  const frozenSideRef = useRef<FrozenSide>("bottom");
  const frameRef = useRef<number | null>(null);

  const measureAnchor = useCallback(() => {
    if (anchorPoint) {
      const anchor = {
        top: anchorPoint.y + window.scrollY,
        bottom: anchorPoint.y + window.scrollY,
        left: anchorPoint.x + window.scrollX,
        right: anchorPoint.x + window.scrollX,
        width: 0,
      };

      anchorRef.current = anchor;

      return anchor;
    }

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
  }, [anchorPoint]);

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
      schedulePositionUpdate({ refreeze: true });
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
  }, [open, schedulePositionUpdate]);

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

  const stopDropdownEvent = (event: SyntheticEvent<HTMLDivElement>) => {
    event.stopPropagation();
  };

  const dropdown = (
    <div
      ref={floatingRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 9999,
        transform: "translate3d(0px, 0px, 0)",
        visibility: "hidden",
        pointerEvents: "auto",
      }}
      className={`filmwave-dropdown-shell ${className}`}
      data-placement={frozenSideRef.current}
      onClick={stopDropdownEvent}
      onPointerDown={stopDropdownEvent}
      onMouseDown={stopDropdownEvent}
    >
      {children}
    </div>
  );

  return (
    <>
      <div
        ref={referenceRef}
        data-dropdown-open={open ? "true" : "false"}
        className={open ? "is-dropdown-open" : ""}
        style={{
          display: "inline-flex",
          width: "fit-content",
          position: "relative",
          zIndex: open ? 10000 : undefined,
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
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
