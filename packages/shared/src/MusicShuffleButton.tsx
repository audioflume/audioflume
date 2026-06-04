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
          d="M3.75 7H7.1C8.9 7 10.3 8.08 11.68 9.9L12.38 10.82"
          stroke="currentColor"
          strokeWidth="2.35"
          strokeLinecap="square"
        />
        <path
          d="M15.5 4.25L20.25 7.75L15.5 11.25"
          stroke="currentColor"
          strokeWidth="2.35"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <path
          d="M14.25 7.75H20.25"
          stroke="currentColor"
          strokeWidth="2.35"
          strokeLinecap="square"
        />
        <path
          d="M3.75 17H7.1C8.9 17 10.3 15.92 11.68 14.1L12.38 13.18"
          stroke="currentColor"
          strokeWidth="2.35"
          strokeLinecap="square"
        />
        <path
          d="M15.5 12.75L20.25 16.25L15.5 19.75"
          stroke="currentColor"
          strokeWidth="2.35"
          strokeLinecap="square"
          strokeLinejoin="miter"
        />
        <path
          d="M14.25 16.25H20.25"
          stroke="currentColor"
          strokeWidth="2.35"
          strokeLinecap="square"
        />
      </svg>
    </button>
  );
}
