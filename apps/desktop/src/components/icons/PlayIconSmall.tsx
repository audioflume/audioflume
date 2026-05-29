type PlayIconSmallProps = {
  size?: number;
};

export default function PlayIconSmall({ size = 14 }: PlayIconSmallProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 5V19L19 12L8 5Z" />
    </svg>
  );
}
