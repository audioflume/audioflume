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
        d="M3.5 8.5H7.75L13 4.25V19.75L7.75 15.5H3.5V8.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {muted ? (
        <>
          <path
            d="M16.5 8.5L21.5 15.5"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <path
            d="M21.5 8.5L16.5 15.5"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path
            d="M16.25 8C18.25 10 18.25 14 16.25 16"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
          <path
            d="M19 5.5C22.5 9 22.5 15 19 18.5"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
