type ShuffleIconSmallProps = {
  size?: number;
};

export default function ShuffleIconSmall({ size = 14 }: ShuffleIconSmallProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 7H5.25C8 7 9.35 9.15 10.75 12C12.15 14.85 13.5 17 16.25 17H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 14L21 17L18 20" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 17H5.25C7.25 17 8.55 15.95 9.65 14.25" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14.35 9.75C15.3 8.15 16.35 7 18.25 7H21" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18 4L21 7L18 10" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
