"use client";

export function MusicShuffleButton({
  active,
  className = "",
  onClick,
}: {
  active: boolean;
  className?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`filmwave-music-shuffle-button${active ? " is-active" : ""}${className ? ` ${className}` : ""}`}
      onClick={onClick}
      aria-label="Shuffle songs"
      aria-pressed={active}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 6H6.55C8.95 6 10.65 7.28 12.22 9.42L13.72 11.48C15.1 13.38 16.38 14.5 18.45 14.5H20"
          stroke="currentColor"
          strokeWidth="2.65"
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
        <path
          d="M3 18H6.55C8.95 18 10.65 16.72 12.22 14.58L13.72 12.52C15.1 10.62 16.38 9.5 18.45 9.5H20"
          stroke="currentColor"
          strokeWidth="2.65"
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
        <path
          d="M17 5.5L21 9.5L17 13.5"
          stroke="currentColor"
          strokeWidth="2.65"
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
        <path
          d="M17 10.5L21 14.5L17 18.5"
          stroke="currentColor"
          strokeWidth="2.65"
          strokeLinecap="butt"
          strokeLinejoin="miter"
        />
      </svg>
    </button>
  );
}
