"use client";

import { useState } from "react";
import HeartIcon from "@/components/icons/HeartIcon";
import MoreIcon from "@/components/icons/MoreIcon";
import PlayIconSmall from "@/components/icons/PlayIconSmall";
import SearchIcon from "@/components/icons/SearchIcon";
import "./community-playlists.css";

const categories = [
  "Documentary",
  "Travel",
  "Sports",
  "Ambient",
  "Western",
  "Urban",
  "Drama",
];

const playlists = [
  {
    title: "Modern Western",
    creator: "Jake R.",
    tracks: 24,
    cover: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "Cinematic Tension",
    creator: "Sarah M.",
    tracks: 31,
    cover: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "Indie Roadtrip",
    creator: "Wes Hicks",
    tracks: 18,
    cover: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "Documentary Moments",
    creator: "Film North",
    tracks: 27,
    cover: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "Late Nights",
    creator: "Louis V.",
    tracks: 16,
    cover: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "A Breath of Air",
    creator: "Olivia K.",
    tracks: 22,
    cover: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "Emotional Piano",
    creator: "James G.",
    tracks: 19,
    cover: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "New York State of Mind",
    creator: "Alex B.",
    tracks: 23,
    cover: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "Open Roads",
    creator: "Matt D.",
    tracks: 20,
    cover: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "Desert Skies",
    creator: "Nora L.",
    tracks: 17,
    cover: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=900&q=88",
  },
];

const featured = [playlists[2], playlists[6], playlists[5], playlists[0], playlists[4]];

export default function CommunityPlaylistsPage() {
  const [query, setQuery] = useState("");

  return (
    <main className="community-page">
      <aside className="community-sidebar" aria-label="Community playlist discovery">
        <section className="community-sidebar-section community-categories">
          <p className="community-sidebar-heading">Categories</p>
          <nav aria-label="Community playlist categories">
            {categories.map((category) => (
              <a key={category} href={`#${category.toLowerCase()}`}>{category}</a>
            ))}
          </nav>
        </section>

        <section className="community-sidebar-section community-featured">
          <p className="community-sidebar-heading">Featured Playlists</p>
          <div className="community-featured-list">
            {featured.map((playlist) => (
              <a className="community-featured-item" href="#community-grid" key={playlist.title}>
                <img src={playlist.cover} alt="" />
                <span>
                  <strong>{playlist.title}</strong>
                  <small>{playlist.tracks} songs</small>
                </span>
              </a>
            ))}
          </div>
        </section>
      </aside>

      <section className="community-content">
        <div className="community-heading-row">
          <h1>Community Playlists</h1>
          <label className="community-search">
            <SearchIcon size={13} />
            <input
              type="text"
              value={query}
              placeholder="Search community playlists..."
              aria-label="Search community playlists"
              onChange={(event) => setQuery(event.target.value)}
            />
            {query.length > 0 && (
              <button
                type="button"
                className="community-search-clear"
                aria-label="Clear community playlist search"
                onClick={() => setQuery("")}
              >
                ×
              </button>
            )}
          </label>
        </div>

        <div className="community-tabs" role="tablist" aria-label="Community playlist sorting">
          {["Trending", "Recent", "Most Liked", "Staff Picks"].map((tab, index) => (
            <button type="button" key={tab} className={index === 0 ? "is-active" : ""}>{tab}</button>
          ))}
        </div>

        <div className="community-grid" id="community-grid">
          {playlists.map((playlist) => (
            <article className="community-card" key={playlist.title}>
              <div className="community-cover-wrap">
                <img className="community-cover" src={playlist.cover} alt="" />
                <button className="community-like" type="button" aria-label={`Like ${playlist.title}`}>
                  <HeartIcon />
                </button>
                <button className="community-play" type="button" aria-label={`Preview ${playlist.title}`}>
                  <PlayIconSmall size={15} />
                </button>
              </div>
              <div className="community-card-title-row">
                <h2>{playlist.title}</h2>
                <button className="community-more playlist-menu-btn-grid" type="button" aria-label={`More options for ${playlist.title}`}>
                  <MoreIcon />
                </button>
              </div>
              <div className="community-creator">
                <span className="community-avatar" aria-hidden="true" />
                <span>by {playlist.creator}</span>
              </div>
              <p className="community-track-count">{playlist.tracks} songs</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
