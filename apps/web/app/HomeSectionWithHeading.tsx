import type { ReactNode } from "react";

type HomeSectionWithHeadingProps = {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
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
  className,
  contentClassName,
}: HomeSectionWithHeadingProps) {
  return (
    <div className={className}>
      <div className="audioflume-home-mockup-section-label">
        <span>{title}</span>
        {action}
      </div>
      <div className={contentClassName}>{children}</div>
    </div>
  );
}
