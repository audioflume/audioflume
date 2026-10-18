type ArrowUpRightIconProps = {
  size?: number;
  className?: string;
  strokeWidth?: number;
};

export default function ArrowUpRightIcon({
  size = 13,
  className,
  strokeWidth = 2.2,
}: ArrowUpRightIconProps) {
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
        d="M7 17L17 7"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      <path
        d="M9 7H17V15"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
