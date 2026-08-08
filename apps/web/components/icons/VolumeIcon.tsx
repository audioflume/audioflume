type VolumeIconProps = {
  className?: string;
  size?: number;
  muted?: boolean;
};

export default function VolumeIcon({
  className,
  size = 14,
  muted = false,
}: VolumeIconProps) {
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
        d="M3.5 9H7.5L12.5 5V19L7.5 15H3.5"
        stroke="currentColor"
        strokeWidth="0.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {muted ? (
        <>
          <path
            d="M16.25 8.5L21.5 15.5"
            stroke="currentColor"
            strokeWidth="0.4"
            strokeLinecap="round"
          />
          <path
            d="M21.5 8.5L16.25 15.5"
            stroke="currentColor"
            strokeWidth="0.4"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path
            d="M16 8.5C18 10.5 18 13.5 16 15.5"
            stroke="currentColor"
            strokeWidth="0.4"
            strokeLinecap="round"
          />
          <path
            d="M18.75 6C21.75 9 21.75 15 18.75 18"
            stroke="currentColor"
            strokeWidth="0.4"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
