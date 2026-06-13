type ShuffleIconSmallProps = {
  size?: number;
  className?: string;
};

export function ShuffleIconSmall({ size = 14, className }: ShuffleIconSmallProps) {
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
        d="M4 7H7.25C8.85 7 9.95 7.75 10.9 9.05L13.1 12.05C14.05 13.35 15.15 14.1 16.75 14.1H19.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4 17H7.25C8.85 17 9.95 16.25 10.9 14.95L13.1 11.95C14.05 10.65 15.15 9.9 16.75 9.9H19.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.25 7.65L19.5 9.9L17.25 12.15"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M17.25 11.85L19.5 14.1L17.25 16.35"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default ShuffleIconSmall;
