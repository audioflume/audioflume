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
        d="M7.5 19V5.25"
        stroke="var(--edit-points-icon-color, currentColor)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 5.25H17.25V10.25H7.5"
        stroke="var(--edit-points-icon-color, currentColor)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
