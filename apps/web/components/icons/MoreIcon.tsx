type MoreIconProps = {
  className?: string;
  size?: number;
};

export default function MoreIcon({ className, size = 15 }: MoreIconProps) {
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
        d="M5 12H5.01"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      <path
        d="M12 12H12.01"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />

      <path
        d="M19 12H19.01"
        stroke="currentColor"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
