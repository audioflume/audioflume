"use client";

import { useEffect, useState } from "react";

function SkeletonSongCard() {
  return (
    <div
      className="skeleton-song-card flex w-full items-center gap-4 px-8 py-4"
      style={{
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      <div className="skeleton-block h-10 w-10 flex-shrink-0 rounded" />

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="skeleton-block h-2" style={{ width: "98%" }} />
        <div className="skeleton-block h-2" style={{ width: "92%" }} />
      </div>
    </div>
  );
}

export default function SkeletonSongList() {
  const [count, setCount] = useState(8);

  useEffect(() => {
    function calculate() {
      const cardHeight = 73;
      const reservedHeight = 56 + 48 + 48 + 44;
      const available = window.innerHeight - reservedHeight;
      const fit = Math.max(3, Math.floor(available / cardHeight));

      setCount(fit);
    }

    calculate();
    window.addEventListener("resize", calculate);

    return () => window.removeEventListener("resize", calculate);
  }, []);

  return (
    <>
      <style>{`
        .skeleton-song-card {
          animation: skeleton-fade-in 0.3s ease-out both;
        }

        ${Array.from(
          { length: 12 },
          (_, index) => `
            .skeleton-song-card:nth-child(${index + 1}) {
              animation-delay: ${index * 0.04}s;
            }
          `,
        ).join("")}
      `}</style>

      <div className="w-full">
        {Array.from({ length: count }, (_, index) => (
          <SkeletonSongCard key={index} />
        ))}
      </div>
    </>
  );
}
