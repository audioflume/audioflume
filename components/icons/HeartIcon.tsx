type HeartIconProps = {
  className?: string;
  size?: number;
  filled?: boolean;
};

export default function HeartIcon({
  className,
  size = 14,
  filled = false,
}: HeartIconProps) {
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
        d="M20.25 6.75C18.75 4.75 15.75 4.5 14 6.25L12 8.25L10 6.25C8.25 4.5 5.25 4.75 3.75 6.75C2.25 8.75 2.5 11.75 4.5 13.75L12 21L19.5 13.75C21.5 11.75 21.75 8.75 20.25 6.75Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}
