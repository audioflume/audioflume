"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function DiscoverCuratedHeroCopy() {
  const router = useRouter();
  const [search, setSearch] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanSearch = search.trim();
    router.push(
      cleanSearch
        ? `/music?search=${encodeURIComponent(cleanSearch)}`
        : "/music",
    );
  }

  return (
    <section className="discover-integrated-hero" aria-label="Discover music">
      <div className="curated-video-hero discover-curated-hero-copy-shell">
        <div className="curated-video-hero-content discover-curated-hero-copy">
          <h1>Endless Audio</h1>

          <p className="curated-video-hero-primary-copy">
            <span>Browse curated music playlists</span>
            <span>Preview audio soundtracks</span>
            <span>For film</span>
          </p>

          <div className="curated-video-hero-secondary-copy">
            <strong>(Tailored Sound)</strong>
            <span>
              Music chosen to fit the cut
              <br />
              From first frame to final
            </span>
          </div>
        </div>
      </div>

      <form className="discover-integrated-search" onSubmit={handleSubmit}>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search music library"
          aria-label="Search music library"
        />
        <button type="submit">Search</button>
      </form>
    </section>
  );
}
