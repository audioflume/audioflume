"use client";

import Link from "next/link";
import ArrowUpRightIcon from "@/components/icons/ArrowUpRightIcon";
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
      <h2>
        <Link className="discover2-watching-heading-link" href="/curated-playlists" aria-label="Explore curated playlists">
          <span className="discover2-watching-heading-default" aria-hidden="true">Curated playlists made for the edit</span>
          <span className="discover2-watching-heading-hover" aria-hidden="true">
            Explore curated playlists
            <svg className="discover2-watching-heading-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
              <path d="M4 21 19 5M4 5h15v15" />
            </svg>
          </span>
        </Link>
      </h2>
      <div className="discover2-playlist-grid">
        {loading
          ? Array.from({ length: 8 }, (_, index) => (
              <div className="discover2-playlist-item" key={index} aria-hidden="true">
                <div className="discover2-playlist-image is-loading" />
                <span className="discover2-playlist-name">&nbsp;</span>
              </div>
            ))
          : playlists.map((playlist) => (
              <div className="discover2-playlist-item" key={playlist.id}>
                <div className="discover2-playlist-image">
                  <Link className="discover2-playlist-cover-link" href={`/curated-playlists/${playlist.id}`} aria-label={`View ${playlist.name}`}>
                    {(playlist.feature_cover_image_url || playlist.cover_image_url) && (
                      <img src={playlist.feature_cover_image_url || playlist.cover_image_url || ""} alt="" loading="lazy" />
                    )}
                  </Link>
                </div>
                <Link className="discover2-playlist-name" href={`/curated-playlists/${playlist.id}`}>{playlist.name}</Link>
              </div>
            ))}
      </div>
      <Link className="discover2-playlist-explore" href="/curated-playlists">
        Explore curated playlists
        <ArrowUpRightIcon size={16} strokeWidth={1.5} />
      </Link>
      <p className="discover2-playlist-intro">Handpicked playlists for every mood, moment, and turning point in the story.</p>
    </section>
  );
}
