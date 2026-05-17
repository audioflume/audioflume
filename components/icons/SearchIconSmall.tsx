type SearchIconSmallProps = {
  className?: string;
  size?: number;
};

export default function SearchIconSmall({
  className = "shrink-0",
  size = 12,
}: SearchIconSmallProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 38.31 38.31"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M38.31,35.48l-11.75-11.74c1.89-2.49,3.03-5.58,3.03-8.94C29.6,6.64,22.96,0,14.8,0S0,6.64,0,14.8s6.64,14.8,14.8,14.8c3.36,0,6.45-1.14,8.94-3.03l11.75,11.74,2.83-2.83ZM14.8,25.6c-5.96,0-10.8-4.84-10.8-10.8S8.84,4,14.8,4s10.8,4.85,10.8,10.8-4.84,10.8-10.8,10.8Z"
        fill="currentColor"
      />
    </svg>
  );
}
