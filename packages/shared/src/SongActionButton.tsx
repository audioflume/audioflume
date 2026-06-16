import type { AnchorHTMLAttributes, ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

export type SongActionButtonActiveMode = "background" | "plain-icon";

export const songActionButtonStyleDefaults = {
  "--filmwave-song-card-action-size": "28px",
  "--filmwave-song-card-action-radius": "999px",
  "--filmwave-song-card-action-hover-bg": "var(--bg-hover-strong)",
  "--filmwave-song-card-action-color": "var(--icon-color)",
  "--filmwave-song-card-action-active-color": "var(--text-primary)",
} as CSSProperties;

function getSongActionButtonStyle({
  active,
  activeMode,
  style,
}: {
  active?: boolean;
  activeMode?: SongActionButtonActiveMode;
  style?: CSSProperties;
}) {
  const plainIcon = activeMode === "plain-icon";

  return {
    ...songActionButtonStyleDefaults,
    ...(active && plainIcon
      ? {
          "--edit-points-icon-color": "var(--text-primary)",
          "--favorite-icon-color": "var(--text-primary)",
        }
      : {}),
    ...style,
  } as CSSProperties;
}

type SongActionButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
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
  const mergedStyle = getSongActionButtonStyle({ active, activeMode, style });
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

type SongActionLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  children: ReactNode;
  label: string;
  active?: boolean;
  activeMode?: SongActionButtonActiveMode;
};

export function SongActionLink({
  children,
  label,
  active = false,
  activeMode = "background",
  className = "",
  style,
  ...props
}: SongActionLinkProps) {
  const plainIcon = activeMode === "plain-icon";
  const mergedStyle = getSongActionButtonStyle({ active, activeMode, style });
  const activeClass = active && !plainIcon ? " is-active" : "";
  const plainClass = plainIcon ? " is-plain-active-icon" : "";

  return (
    <a
      {...props}
      aria-label={label}
      style={mergedStyle}
      className={`filmwave-song-action-button${plainClass}${activeClass}${className ? ` ${className}` : ""}`}
    >
      {children}
    </a>
  );
}
