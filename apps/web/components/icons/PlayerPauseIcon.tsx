type PlayerPauseIconProps = {
  size?: number;
  className?: string;
};

export default function PlayerPauseIcon({
  size = 20,
  className,
}: PlayerPauseIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}
