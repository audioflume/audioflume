type ShuffleIconSmallProps = {
  size?: number;
  className?: string;
};

export function ShuffleIconSmall({ size = 15, className }: ShuffleIconSmallProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 468.15 402.11"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M0,316.54h74.19c45.57,0,87.69-24.27,110.54-63.7l60.01-103.56c22.85-39.43,64.97-63.7,110.54-63.7h94.1"
        stroke="currentColor"
        strokeWidth="32"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M0,85.57h74.19c45.57,0,87.69,24.27,110.54,63.7l60.01,103.56c22.85,39.43,64.97,63.7,110.54,63.7h94.1"
        stroke="currentColor"
        strokeWidth="32"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="375.1 7.78 452.6 85.28 375.1 162.78"
        stroke="currentColor"
        strokeWidth="32"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points="375.1 394.33 452.6 316.83 375.1 239.33"
        stroke="currentColor"
        strokeWidth="32"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default ShuffleIconSmall;
