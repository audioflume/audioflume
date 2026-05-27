type PlaylistIconProps = {
  className?: string;
  size?: number;
};

export default function PlaylistIcon({ className, size = 16 }: PlaylistIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 7H19" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M5 12H15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M5 17H12" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
