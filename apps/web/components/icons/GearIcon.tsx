type GearIconProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export default function GearIcon({
  size = 16,
  strokeWidth = 1.6,
  className,
}: GearIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6 18 18M18 6l-1.4 1.4M7.4 16.6 6 18" />
      <circle cx="12" cy="12" r="6.5" />
    </svg>
  );
}
