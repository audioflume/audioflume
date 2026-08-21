type SearchIconProps = {
  size?: number;
  className?: string;
};

export default function SearchIcon({ size = 13, className }: SearchIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 800 800"
      aria-hidden="true"
      className={className}
    >
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M355.85,6.76C159.32,6.82.05,166.19.11,362.72s159.43,355.8,355.97,355.74c196.49-.06,355.74-159.36,355.74-355.85-.09-196.54-159.43-355.82-355.97-355.85ZM355.85,63.05c165.44,0,299.56,134.12,299.56,299.56s-134.12,299.56-299.56,299.56S56.29,528.05,56.29,362.61c.08-165.41,134.15-299.48,299.56-299.56Z"
      />
      <path
        fill="currentColor"
        fillRule="evenodd"
        d="M791.78,745.37l-176.65-176.65c-10.8-11.18-28.62-11.49-39.8-.69-11.18,10.8-11.49,28.62-.69,39.8.23.23.46.47.69.69l176.65,176.56c10.8,11.18,28.62,11.49,39.8.69,11.18-10.8,11.49-28.62.69-39.8-.23-.23-.46-.47-.69-.69v.08Z"
      />
    </svg>
  );
}
