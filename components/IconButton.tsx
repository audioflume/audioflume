import { iconButtonClass } from "@/components/uiClasses";

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
      className={`${iconButtonClass} ${
        active ? "text-[var(--text-primary)]" : ""
      }`}
    >
      {children}
    </button>
  );
}
