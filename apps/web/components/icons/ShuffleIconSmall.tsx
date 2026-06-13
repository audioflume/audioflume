type ShuffleIconSmallProps = {
  size?: number;
};

export default function ShuffleIconSmall({ size = 14 }: ShuffleIconSmallProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 7.25H6.4C8.15 7.25 9.15 8.15 10.05 9.7L13.95 16.3C14.85 17.85 15.85 18.75 17.6 18.75H20"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 16.75H6.4C8.15 16.75 9.15 15.85 10.05 14.3L13.95 7.7C14.85 6.15 15.85 5.25 17.6 5.25H20"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.7 2.95L20.05 5.25L17.7 7.55"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.7 16.45L20.05 18.75L17.7 21.05"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
