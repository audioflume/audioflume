type WarningIconProps = {
  size?: number;
  className?: string;
};

export default function WarningIcon({
  size = 15,
  className = "shrink-0",
}: WarningIconProps) {
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
        d="M12 8V13"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M12 17H12.01"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M10.29 4.86L2.82 18C2.31 18.89 2.95 20 3.98 20H20.02C21.05 20 21.69 18.89 21.18 18L13.71 4.86C13.2 3.95 10.8 3.95 10.29 4.86Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
