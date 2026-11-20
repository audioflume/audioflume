"use client";

import { useEffect, useState } from "react";
import {
  HomeArtistShelf,
  HomeArtistShelfSkeleton,
  type HomeArtist,
} from "../HomePageContent";

export default function ActiveDiscoverBanner() {
  const [artists, setArtists] = useState<HomeArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/discover-featured-artists", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Failed to load featured artists");
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setArtists(Array.isArray(data?.artists) ? data.artists : []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setArtists([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="audioflume-home-mockup is-discover-page discover2-active-banner">
      <section className="audioflume-home-mockup-artists is-discover-featured-artists">
        {loading ? (
          <HomeArtistShelfSkeleton discoverLayout />
        ) : artists.length > 0 ? (
          <HomeArtistShelf
            artists={artists}
            homeFlashImages={[]}
            discoverLayout
            discoverPlaybackIcon
          />
        ) : null}
      </section>
    </div>
  );
}
