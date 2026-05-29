type UserIconProps = {
  size?: number;
  className?: string;
};

export default function UserIcon({ size = 13, className }: UserIconProps) {
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
        d="M12 12C14.2091 12 16 10.2091 16 8C16 5.79086 14.2091 4 12 4C9.79086 4 8 5.79086 8 8C8 10.2091 9.79086 12 12 12Z"
        stroke="currentColor"
        strokeWidth="1.9"
      />
      <path
        d="M5 20C5.8 17.2 8.4 15.5 12 15.5C15.6 15.5 18.2 17.2 19 20"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
    </svg>
  );
}
