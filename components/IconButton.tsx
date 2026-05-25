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
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`${iconButtonClass} ${active ? activeClassName : ""}`}
    >
      {children}
    </button>
  );
}
