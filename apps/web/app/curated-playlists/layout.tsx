import Link from "next/link";
import type { ReactNode } from "react";
import "./curated-playlists.css";

export default function CuratedPlaylistsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <Link href="/music" className="curated-featured-library-link">
        Explore music library
      </Link>
      {children}
    </>
  );
}
