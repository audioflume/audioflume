type CheckIconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

export default function CheckIcon({
  size = 13,
  className,
  strokeWidth = 2.6,
}: CheckIconProps) {
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
        d="M5 12.5L9.5 17L19 7"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
