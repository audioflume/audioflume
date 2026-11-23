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
      <rect x="3.1" y="6.1" width="1.8" height="1.8" fill="currentColor" />
      <rect x="3.1" y="11.1" width="1.8" height="1.8" fill="currentColor" />
      <rect x="3.1" y="16.1" width="1.8" height="1.8" fill="currentColor" />
    </svg>
  );
}
