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
        d="M4.25 7.25H6.35C7.7 7.25 8.88 7.95 9.6 9.1L14.4 16.9C15.12 18.05 16.3 18.75 17.65 18.75H19.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.25 16.75H6.35C7.7 16.75 8.88 16.05 9.6 14.9L14.4 7.1C15.12 5.95 16.3 5.25 17.65 5.25H19.75"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.25 2.9L19.75 5.25L17.25 7.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.25 16.4L19.75 18.75L17.25 21.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
