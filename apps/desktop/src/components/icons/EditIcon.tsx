type EditIconProps = {
  size?: number;
};

export default function EditIcon({ size = 14 }: EditIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 20H8.25L19.5 8.75C20.3284 7.92157 20.3284 6.57843 19.5 5.75L18.25 4.5C17.4216 3.67157 16.0784 3.67157 15.25 4.5L4 15.75V20Z"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14 5.75L18.25 10"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
