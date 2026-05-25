import {
  iconButtonActiveClass,
  iconButtonClass,
} from "@/components/uiClasses";

export default function IconButton({
  children,
  label,
  onClick,
  active = false,
}: {
  children: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`${iconButtonClass} ${active ? iconButtonActiveClass : ""}`}
    >
      {children}
    </button>
  );
}
