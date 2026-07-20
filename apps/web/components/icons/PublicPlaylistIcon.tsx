type PublicPlaylistIconProps = {
  className?: string;
  size?: number;
  title?: string;
};

export default function PublicPlaylistIcon({
  className,
  size = 12,
  title = "Public playlist",
}: PublicPlaylistIconProps) {
  return (
    <span
      className={className}
      role="img"
      aria-label={title}
      title={title}
    >
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        aria-hidden="true"
      >
        <circle
          cx="12"
          cy="12"
          r="8.25"
          stroke="currentColor"
          strokeWidth="1.7"
        />
        <path
          d="M3.9 12h16.2M12 3.75c2.05 2.25 3.1 5 3.1 8.25S14.05 18 12 20.25C9.95 18 8.9 15.25 8.9 12S9.95 6 12 3.75Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}
