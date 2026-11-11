"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode, Ref } from "react";
import styles from "./PlaylistCardShell.module.css";

type PlaylistCardShellProps = {
  href?: string;
  cardRef?: Ref<HTMLElement>;
  cardStyle?: CSSProperties;
  ariaLabel?: string;
  className?: string;
  mediaClassName?: string;
  squareMedia?: boolean;
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
  cardRef,
  cardStyle,
  ariaLabel,
  className,
  mediaClassName,
  squareMedia = false,
  mediaLinkClassName,
  mediaStyle,
  mediaDataAttribute,
  media,
  overlays,
  details,
}: PlaylistCardShellProps) {
  return (
    <article ref={cardRef} style={cardStyle} className={joinClasses(styles.card, className)}>
      <div
        {...(mediaDataAttribute ? { [mediaDataAttribute]: "" } : {})}
        className={joinClasses(styles.mediaShell, squareMedia ? styles.squareMedia : undefined, mediaClassName)}
        style={mediaStyle}
      >
        {href ? (
          <Link
            href={href}
            aria-label={ariaLabel}
            className={joinClasses(styles.mediaLink, mediaLinkClassName)}
          >
            {media}
          </Link>
        ) : (
          media
        )}
        {overlays}
      </div>
      {details}
    </article>
  );
}
