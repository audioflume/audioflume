import type { CSSProperties } from "react";
import {
  iconButtonActiveClass,
  iconButtonClass,
} from "@/components/uiClasses";

export default function IconButton({
  children,
  label,
  onClick,
  active = false,
  activeClassName = iconButtonActiveClass,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
  activeClassName?: string;
}) {
  const isCueMarkerToggle = label === "Hide cue markers" || label === "Show cue markers";
  const style =
    active && isCueMarkerToggle
      ? ({ "--edit-points-icon-color": "#000000" } as CSSProperties)
      : undefined;

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={isCueMarkerToggle ? undefined : active}
      onClick={onClick}
      style={style}
      className={`${iconButtonClass} ${active && !isCueMarkerToggle ? activeClassName : ""}`}
    >
      {children}
    </button>
  );
}
