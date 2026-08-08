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
        d="M2.75 8H7.5L13.25 3.5V20.5L7.5 16H2.75V8Z"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {muted ? (
        <>
          <path
            d="M16.25 8L22 16"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
          <path
            d="M22 8L16.25 16"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path
            d="M16 7.5C18.5 10 18.5 14 16 16.5"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
          <path
            d="M18.75 4.75C22.75 8.75 22.75 15.25 18.75 19.25"
            stroke="currentColor"
            strokeWidth="1.65"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
}
