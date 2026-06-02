import type { ElementType, ReactNode } from "react";

export type SettingsSideNavItem = {
  label: string;
  helper?: string;
  href?: string;
  active?: boolean;
  onClick?: () => void;
};

function SettingsSideNavArrowIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SettingsSideNav({
  kicker,
  title,
  items,
  linkComponent,
  className = "",
  ariaLabel = "Settings navigation",
}: {
  kicker: ReactNode;
  title: ReactNode;
  items: SettingsSideNavItem[];
  linkComponent?: ElementType;
  className?: string;
  ariaLabel?: string;
}) {
  const LinkComponent = linkComponent;

  return (
    <aside className={`filmwave-settings-side-nav${className ? ` ${className}` : ""}`}>
      <div className="filmwave-settings-side-nav-head">
        <div className="filmwave-settings-side-nav-kicker">{kicker}</div>
        <div className="filmwave-settings-side-nav-title">{title}</div>
      </div>

      <nav className="filmwave-settings-side-nav-list" aria-label={ariaLabel}>
        {items.map((item) => {
          const active = Boolean(item.active);
          const className = `filmwave-settings-side-nav-item${active ? " is-active" : ""}`;
          const content = (
            <>
              <span className="filmwave-settings-side-nav-item-copy">
                <span className="filmwave-settings-side-nav-item-label">{item.label}</span>
                {item.helper ? (
                  <span className="filmwave-settings-side-nav-item-helper">{item.helper}</span>
                ) : null}
              </span>
              <span className="filmwave-settings-side-nav-item-arrow">
                <SettingsSideNavArrowIcon />
              </span>
            </>
          );

          if (LinkComponent && item.href) {
            return (
              <LinkComponent key={item.href} href={item.href} className={className}>
                {content}
              </LinkComponent>
            );
          }

          if (item.href) {
            return (
              <a key={item.href} href={item.href} className={className}>
                {content}
              </a>
            );
          }

          return (
            <button key={item.label} type="button" className={className} onClick={item.onClick}>
              {content}
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
