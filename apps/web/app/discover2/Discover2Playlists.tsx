"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type CuratedPlaylist = {
  id: number;
  name: string;
  cover_image_url: string | null;
  feature_cover_image_url?: string | null;
};

export default function Discover2Playlists() {
  const [playlists, setPlaylists] = useState<CuratedPlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/curated-playlists", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Unable to load curated playlists");
        return response.json();
      })
      .then((data) => {
        if (!controller.signal.aborted) {
          setPlaylists(Array.isArray(data) ? data.slice(0, 8) : []);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setPlaylists([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, []);

  return (
    <section className="discover2-playlist-section" aria-label="Curated playlists">
      <h2>Thoughtfully curated playlists for every story.</h2>
      <div className="discover2-playlist-grid">
        {loading
          ? Array.from({ length: 8 }, (_, index) => (
              <div className="discover2-playlist-item" key={index} aria-hidden="true">
                <div className="discover2-playlist-image is-loading" />
                <span className="discover2-playlist-name">&nbsp;</span>
              </div>
            ))
          : playlists.map((playlist) => (
              <Link className="discover2-playlist-item" href={`/curated-playlists/${playlist.id}`} key={playlist.id}>
                <div className="discover2-playlist-image">
                  {(playlist.feature_cover_image_url || playlist.cover_image_url) && (
                    <img src={playlist.feature_cover_image_url || playlist.cover_image_url || ""} alt="" loading="lazy" />
                  )}
                </div>
                <span className="discover2-playlist-name">{playlist.name}</span>
              </Link>
            ))}
      </div>
    </section>
  );
}
