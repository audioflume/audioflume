import Link from "next/link";

type GenreFilterPillsProps = {
  genres: readonly string[];
  className?: string;
  showPlaceholders?: boolean;
};

export default function GenreFilterPills({
  genres,
  className = "",
  showPlaceholders = false,
}: GenreFilterPillsProps) {
  const visibleGenres = genres.filter(Boolean).slice(0, 3);
  return (
    <span className={`audioflume-genre-filter-pills ${className}`.trim()}>
      {visibleGenres.length
        ? visibleGenres.map((genre) => (
            <Link
              key={genre}
              href={`/music?genre=${encodeURIComponent(genre)}`}
              className="audioflume-genre-filter-pill"
            >
              {genre}
            </Link>
          ))
        : showPlaceholders
          ? [0, 1, 2].map((index) => (
              <span key={index} className="audioflume-genre-filter-pill is-placeholder" aria-hidden="true" />
            ))
          : null}
    </span>
  );
}
