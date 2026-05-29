type PauseIconProps = {
  size?: number;
  className?: string;
};

export default function PauseIcon({ size = 14, className }: PauseIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 5H10V19H7V5Z" />
      <path d="M14 5H17V19H14V5Z" />
    </svg>
  );
}
