type ShuffleIconSmallProps = {
  size?: number;
  className?: string;
};

/* Solid shuffle — heavier round-capped strokes with filled arrowheads,
   replacing the previous thin open-polyline version. */
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
        strokeWidth="52"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M0,85.57h74.19c45.57,0,87.69,24.27,110.54,63.7l60.01,103.56c22.85,39.43,64.97,63.7,110.54,63.7h94.1"
        stroke="currentColor"
        strokeWidth="52"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points="375.1 0 468.15 85.28 375.1 170.56"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="24"
        strokeLinejoin="round"
      />
      <polygon
        points="375.1 402.11 468.15 316.83 375.1 231.55"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth="24"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default ShuffleIconSmall;
