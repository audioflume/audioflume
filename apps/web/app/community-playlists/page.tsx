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
    initials: "JR",
    tracks: 24,
    cover: "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "Cinematic Tension",
    creator: "Sarah M.",
    initials: "SM",
    tracks: 31,
    cover: "https://images.unsplash.com/photo-1487958449943-2429e8be8625?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "Indie Roadtrip",
    creator: "Wes Hicks",
    initials: "WH",
    tracks: 18,
    cover: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "Documentary Moments",
    creator: "Film North",
    initials: "FN",
    tracks: 27,
    cover: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "Late Nights",
    creator: "Louis V.",
    initials: "LV",
    tracks: 16,
    cover: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "A Breath of Air",
    creator: "Olivia K.",
    initials: "OK",
    tracks: 22,
    cover: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "Emotional Piano",
    creator: "James G.",
    initials: "JG",
    tracks: 19,
    cover: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "New York State of Mind",
    creator: "Alex B.",
    initials: "AB",
    tracks: 23,
    cover: "https://images.unsplash.com/photo-1485871981521-5b1fd3805eee?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "Open Roads",
    creator: "Matt D.",
    initials: "MD",
    tracks: 20,
    cover: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=900&q=88",
  },
  {
    title: "Desert Skies",
    creator: "Nora L.",
    initials: "NL",
    tracks: 17,
    cover: "https://images.unsplash.com/photo-1509316785289-025f5b846b35?auto=format&fit=crop&w=900&q=88",
  },
];

const featured = [playlists[2], playlists[6], playlists[5], playlists[0], playlists[4]];

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8.6 6.7v10.6L17 12 8.6 6.7Z" fill="currentColor" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m20 20-4.25-4.25m1.25-4.5a5.75 5.75 0 1 1-11.5 0 5.75 5.75 0 0 1 11.5 0Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.7 5.9c-1.8-1.8-4.7-1.8-6.5 0L12 8.1 9.8 5.9a4.6 4.6 0 0 0-6.5 6.5L12 21l8.7-8.6a4.6 4.6 0 0 0 0-6.5Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export default function CommunityPlaylistsPage() {
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
            <SearchIcon />
            <input type="search" placeholder="Search community playlists..." aria-label="Search community playlists" />
          </label>
        </div>

        <div className="community-tabs" role="tablist" aria-label="Community playlist sorting">
          {['Trending', 'Recent', 'Most Liked', 'Staff Picks'].map((tab, index) => (
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
                  <PlayIcon />
                </button>
              </div>
              <div className="community-card-title-row">
                <h2>{playlist.title}</h2>
                <button className="community-more" type="button" aria-label={`More options for ${playlist.title}`}>•••</button>
              </div>
              <div className="community-creator">
                <span className="community-avatar">{playlist.initials}</span>
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
