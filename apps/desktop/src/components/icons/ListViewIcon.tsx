type ListViewIconProps = {
  size?: number;
};

export default function ListViewIcon({ size = 17 }: ListViewIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M8 7H20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="butt"
      />
      <path
        d="M8 12H20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="butt"
      />
      <path
        d="M8 17H20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="butt"
      />
      <rect x="2.8" y="5.8" width="2.4" height="2.4" fill="currentColor" />
      <rect x="2.8" y="10.8" width="2.4" height="2.4" fill="currentColor" />
      <rect x="2.8" y="15.8" width="2.4" height="2.4" fill="currentColor" />
    </svg>
  );
}
