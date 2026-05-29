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
        d="M6 5V19"
        stroke="var(--edit-points-icon-color, currentColor)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M18 5V19"
        stroke="var(--edit-points-icon-color, currentColor)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M9 8.5H15"
        stroke="var(--edit-points-icon-color, currentColor)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M9 15.5H15"
        stroke="var(--edit-points-icon-color, currentColor)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <path
        d="M12 10.5V13.5"
        stroke="var(--edit-points-icon-color, currentColor)"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
