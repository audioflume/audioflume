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
        d="M4.5 9.25H8L12.5 5.5V18.5L8 14.75H4.5V9.25Z"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {muted ? (
        <>
          <path
            d="M16.5 9.25L20.5 14.75"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M20.5 9.25L16.5 14.75"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path
            d="M16 9C17.5 10.5 17.5 13.5 16 15"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <path
            d="M18.75 6.75C21.65 9.65 21.65 14.35 18.75 17.25"
            stroke="currentColor"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
