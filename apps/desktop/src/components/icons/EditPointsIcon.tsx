type EditPointsIconProps = {
  size?: number;
};

export default function EditPointsIcon({ size = 14 }: EditPointsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 20V4"
        stroke="var(--edit-points-icon-color, currentColor)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M7 4.25L18.5 8L7 11.75V4.25Z"
        stroke="var(--edit-points-icon-color, currentColor)"
        strokeWidth="1.9"
        strokeLinejoin="round"
      />
    </svg>
  );
}
