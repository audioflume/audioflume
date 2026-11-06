import type { ReactNode } from "react";
import Link from "next/link";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";

type HomeSectionWithHeadingProps = {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
  linkHref?: string;
  linkLabel?: string;
  className?: string;
  contentClassName?: string;
};

/**
 * Home/Discover section heading with content outside the heading's spacing flow.
 * Keep grid/flex gaps on the content element: never place the title inside it.
 * The existing section-label class owns the canonical title-to-content margin.
 */
export default function HomeSectionWithHeading({
  title,
  children,
  action,
  linkHref,
  linkLabel,
  className,
  contentClassName,
}: HomeSectionWithHeadingProps) {
  return (
    <div className={className}>
      <div className="audioflume-home-mockup-section-label">
        <span>{title}</span>
        {linkHref && linkLabel ? (
          <Link
            href={linkHref}
            className="audioflume-arrow-text-link inline-flex items-center gap-[5px]"
          >
            {linkLabel}
            <ArrowUpRightIcon
              size={16}
              strokeWidth={1.5}
              className="translate-y-[2px]"
            />
          </Link>
        ) : action}
      </div>
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
