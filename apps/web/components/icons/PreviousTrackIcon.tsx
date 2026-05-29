type PreviousTrackIconProps = {
  size?: number;
  className?: string;
};

export default function PreviousTrackIcon({
  size = 16,
  className,
}: PreviousTrackIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <polygon points="19,20 9,12 19,4" />
      <rect x="5" y="4" width="2" height="16" />
    </svg>
  );
}
