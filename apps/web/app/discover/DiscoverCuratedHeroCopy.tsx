"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import SearchIcon from "@/components/icons/SearchIcon";

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
          <h1>Made for Film</h1>

          <p className="curated-video-hero-primary-copy">
            <span>Discover curated music playlists</span>
            <span>Premium audio soundtracks</span>
            <span>For film</span>
          </p>

          <div className="curated-video-hero-secondary-copy">
            <strong>(Tailored Sound)</strong>
            <span>
              Discover curated music playlists, premium audio
              <br />
              soundtracks for film
            </span>
          </div>
        </div>
      </div>

      <form className="discover-integrated-search" onSubmit={handleSubmit}>
        <span className="discover-integrated-search-icon" aria-hidden="true">
          <SearchIcon size={15} />
        </span>
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search music library"
          aria-label="Search music library"
        />
        <button type="submit">
          <span>Search</span>
          <span className="discover-integrated-search-arrow" aria-hidden="true">
            ↗
          </span>
        </button>
      </form>

      <div className="discover-integrated-values">
        <div>
          <strong>Human Curated Music Library</strong>
          <span>
            Human-picked tracks, thoughtful moods, and music chosen for real
            edits.
          </span>
        </div>
        <div>
          <strong>Thousands of Sound Effects</strong>
          <span>
            Thousands of sound effects, textures, and details for richer edits.
          </span>
        </div>
      </div>
    </section>
  );
}
