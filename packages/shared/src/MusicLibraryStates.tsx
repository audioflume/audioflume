"use client";

import { useEffect, useState } from "react";

function getDefaultSkeletonCount() {
  if (typeof window === "undefined") return 8;

  const cardHeight = 73;
  const reservedHeight = 56 + 48 + 48 + 44;
  const available = window.innerHeight - reservedHeight;

  return Math.max(3, Math.floor(available / cardHeight));
}

export function MusicLibrarySkeletonCard() {
  return (
    <div className="filmwave-music-library-skeleton-card">
      <div className="skeleton-block filmwave-music-library-skeleton-cover" />

      <div className="filmwave-music-library-skeleton-copy">
        <div className="skeleton-block filmwave-music-library-skeleton-line is-wide" />
        <div className="skeleton-block filmwave-music-library-skeleton-line is-narrow" />
      </div>
    </div>
  );
}

export function MusicLibrarySkeletonList({ count }: { count?: number }) {
  const [resolvedCount, setResolvedCount] = useState(count ?? getDefaultSkeletonCount());

  useEffect(() => {
    if (count !== undefined) {
      setResolvedCount(count);
      return;
    }

    function calculate() {
      setResolvedCount(getDefaultSkeletonCount());
    }

    calculate();
    window.addEventListener("resize", calculate);

    return () => window.removeEventListener("resize", calculate);
  }, [count]);

  return (
    <div className="filmwave-music-library-skeleton-list">
      {Array.from({ length: resolvedCount }, (_, index) => (
        <MusicLibrarySkeletonCard key={index} />
      ))}
    </div>
  );
}

export function MusicLibraryEmptyState({
  title = "No songs found",
  description = "Clear a filter or search for a different cue.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="filmwave-music-library-empty-state">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

export function MusicLibraryLoadNotice({ children }: { children: React.ReactNode }) {
  return <div className="filmwave-music-library-load-notice">{children}</div>;
}
