type CheckMarkIconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

export default function CheckMarkIcon({
  size = 12,
  className,
  strokeWidth = 2.7,
}: CheckMarkIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M20 6L9 17L4 12"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
