type NoVocalsIconProps = {
  className?: string;
  size?: number;
};

export default function NoVocalsIcon({
  className,
  size = 24,
}: NoVocalsIconProps) {
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
        d="M12 4.75C10.62 4.75 9.5 5.87 9.5 7.25V11.25C9.5 12.63 10.62 13.75 12 13.75C13.38 13.75 14.5 12.63 14.5 11.25V7.25C14.5 5.87 13.38 4.75 12 4.75Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.75 10.75C6.75 13.65 9.1 16 12 16C14.9 16 17.25 13.65 17.25 10.75"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M12 16V19.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M8.75 19.25H15.25"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M5 19L19 5"
        stroke="currentColor"
        strokeWidth="1.65"
        strokeLinecap="round"
      />
    </svg>
  );
}
