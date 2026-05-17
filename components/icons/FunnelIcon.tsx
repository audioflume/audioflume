type FunnelIconProps = {
  size?: number;
  className?: string;
};

export default function FunnelIcon({ size = 13, className }: FunnelIconProps) {
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
        d="M4 5H20L14 12V18L10 20V12L4 5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}
