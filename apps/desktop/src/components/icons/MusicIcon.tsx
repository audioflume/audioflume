type MusicIconProps = {
  size?: number;
};

export default function MusicIcon({ size = 12 }: MusicIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9 18.5C9 19.8807 7.65685 21 6 21C4.34315 21 3 19.8807 3 18.5C3 17.1193 4.34315 16 6 16C7.65685 16 9 17.1193 9 18.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M21 16.5C21 17.8807 19.6569 19 18 19C16.3431 19 15 17.8807 15 16.5C15 15.1193 16.3431 14 18 14C19.6569 14 21 15.1193 21 16.5Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M9 18.5V5.5L21 3.5V16.5"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 9L21 7"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
