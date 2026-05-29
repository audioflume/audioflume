type PlayerPlayIconProps = {
  size?: number;
  className?: string;
};

export default function PlayerPlayIcon({
  size = 20,
  className,
}: PlayerPlayIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <polygon points="5,3 19,12 5,21" />
    </svg>
  );
}
