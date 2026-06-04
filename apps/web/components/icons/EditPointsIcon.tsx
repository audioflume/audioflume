type EditPointsIconProps = {
  size?: number;
};

export default function EditPointsIcon({ size = 14 }: EditPointsIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="-45 -65 392.66 570.13"
      fill="none"
      aria-hidden="true"
    >
      <line
        x1="11"
        y1="440.13"
        x2="11"
        y2="13.68"
        stroke="var(--edit-points-icon-color, currentColor)"
        strokeWidth="36"
        strokeMiterlimit="10"
        strokeLinecap="round"
      />
      <polygon
        points="11 235.89 291.66 174.16 291.66 75.41 11 13.68 11 235.89"
        stroke="var(--edit-points-icon-color, currentColor)"
        strokeWidth="36"
        strokeMiterlimit="10"
        strokeLinejoin="round"
      />
    </svg>
  );
}
