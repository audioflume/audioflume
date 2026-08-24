type GearIconProps = {
  size?: number;
  strokeWidth?: number;
  className?: string;
};

export default function GearIcon({
  size = 15,
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
      <polygon points="11.04,2.25 12.96,2.25 14.38,4.15 15.87,4.77 18.22,4.42 19.58,5.78 19.23,8.13 19.85,9.62 21.75,11.04 21.75,12.96 19.85,14.38 19.23,15.87 19.58,18.22 18.22,19.58 15.87,19.23 14.38,19.85 12.96,21.75 11.04,21.75 9.62,19.85 8.13,19.23 5.78,19.58 4.42,18.22 4.77,15.87 4.15,14.38 2.25,12.96 2.25,11.04 4.15,9.62 4.77,8.13 4.42,5.78 5.78,4.42 8.13,4.77 9.62,4.15" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
