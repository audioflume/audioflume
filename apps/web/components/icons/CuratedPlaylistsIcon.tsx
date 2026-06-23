type CuratedPlaylistsIconProps = {
  className?: string;
  size?: number;
};

export default function CuratedPlaylistsIcon({
  className,
  size = 16,
}: CuratedPlaylistsIconProps) {
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
        d="M6.5 5.5H15.5C16.6 5.5 17.5 6.4 17.5 7.5V16.5C17.5 17.6 16.6 18.5 15.5 18.5H6.5C5.4 18.5 4.5 17.6 4.5 16.5V7.5C4.5 6.4 5.4 5.5 6.5 5.5Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      <path
        d="M8 9H13.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M8 12.5H12"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M8 16H10.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />

      <path
        d="M8 3.5H16.5C18.15 3.5 19.5 4.85 19.5 6.5V14"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />

      <path
        d="M14.4 15.4L16 17L19.4 13.6"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
