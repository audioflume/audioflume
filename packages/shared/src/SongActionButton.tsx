import type { CSSProperties, ReactNode } from "react";

export type SongActionButtonActiveMode = "background" | "plain-icon";

type SongActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  label: string;
  active?: boolean;
  activeMode?: SongActionButtonActiveMode;
};

export function SongActionButton({
  children,
  label,
  active = false,
  activeMode = "background",
  className = "",
  style,
  ...props
}: SongActionButtonProps) {
  const plainIcon = activeMode === "plain-icon";
  const mergedStyle = active && plainIcon
    ? ({
        "--edit-points-icon-color": "var(--text-primary)",
        "--favorite-icon-color": "var(--text-primary)",
        ...style,
      } as CSSProperties)
    : style;
  const activeClass = active && !plainIcon ? " is-active" : "";
  const plainClass = plainIcon ? " is-plain-active-icon" : "";

  return (
    <button
      {...props}
      type="button"
      aria-label={label}
      style={mergedStyle}
      className={`filmwave-song-action-button${plainClass}${activeClass}${className ? ` ${className}` : ""}`}
    >
      {children}
    </button>
  );
}
