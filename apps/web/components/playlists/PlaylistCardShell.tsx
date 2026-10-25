"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import styles from "./PlaylistCardShell.module.css";

type PlaylistCardShellProps = {
  href: string;
  ariaLabel?: string;
  className?: string;
  mediaClassName?: string;
  mediaLinkClassName?: string;
  mediaStyle?: CSSProperties;
  mediaDataAttribute?: string;
  media: ReactNode;
  overlays?: ReactNode;
  details?: ReactNode;
};

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function PlaylistCardShell({
  href,
  ariaLabel,
  className,
  mediaClassName,
  mediaLinkClassName,
  mediaStyle,
  mediaDataAttribute,
  media,
  overlays,
  details,
}: PlaylistCardShellProps) {
  return (
    <article className={joinClasses(styles.card, className)}>
      <div
        {...(mediaDataAttribute ? { [mediaDataAttribute]: "" } : {})}
        className={joinClasses(styles.mediaShell, mediaClassName)}
        style={mediaStyle}
      >
        <Link
          href={href}
          aria-label={ariaLabel}
          className={joinClasses(styles.mediaLink, mediaLinkClassName)}
        >
          {media}
        </Link>
        {overlays}
      </div>
      {details}
    </article>
  );
}
