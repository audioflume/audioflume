type SongMatchIconProps = {
  size?: number;
};

export default function SongMatchIcon({ size = 16 }: SongMatchIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9.1 17.35C9.1 18.66 7.92 19.7 6.45 19.7C4.98 19.7 3.8 18.66 3.8 17.35C3.8 16.04 4.98 15 6.45 15C7.92 15 9.1 16.04 9.1 17.35Z"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M9.1 17.35V6.15L15.85 5V7"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9.1 8.75L15.85 7.6"
        stroke="currentColor"
        strokeWidth="1.55"
        strokeLinecap="round"
      />
      <path
        d="M18.8 12.2L19.9 14.8L22.5 15.9L19.9 17L18.8 19.6L17.7 17L15.1 15.9L17.7 14.8L18.8 12.2Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}
