import Footer from "@/components/Footer";
import PublicArtistMusic from "@/components/artists/PublicArtistMusic";
import type {
  PublicArtistPageData,
  PublicArtistPlaylist,
  PublicArtistRelease,
} from "@/lib/publicArtist";

type PublicArtistPageViewProps = {
  data: PublicArtistPageData;
  embedded?: boolean;
};

function normalizeExternalUrl(value: string | null) {
  if (!value) return null;
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function formatReleaseType(type: PublicArtistRelease["release_type"]) {
  if (type === "ep") return "EP";
  return type.charAt(0).toUpperCase() + type.slice(1);
}

function formatReleaseDate(value: string | null) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatTrackCount(count: number) {
  return `${count} track${count === 1 ? "" : "s"}`;
}

function InstagramIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <rect
        x="3"
        y="3"
        width="18"
        height="18"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle
        cx="12"
        cy="12"
        r="4.2"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <circle cx="17.4" cy="6.7" r="1" fill="currentColor" />
    </svg>
  );
}

function ReleaseCard({ release }: { release: PublicArtistRelease }) {
  const releaseDate = formatReleaseDate(release.release_date);

  return (
    <article className="artist-public-card">
      <div className="artist-public-card-art">
        {release.cover_image_url ? (
          <img src={release.cover_image_url} alt="" />
        ) : (
          <div className="artist-public-card-placeholder" aria-hidden="true" />
        )}
      </div>
      <div className="artist-public-card-copy">
        <h3>{release.title}</h3>
        <p>
          {formatReleaseType(release.release_type)} · {formatTrackCount(release.track_count)}
          {releaseDate ? ` · ${releaseDate}` : ""}
        </p>
      </div>
    </article>
  );
}

function PlaylistCard({ playlist }: { playlist: PublicArtistPlaylist }) {
  return (
    <article className="artist-public-card">
      <div className="artist-public-card-art">
        {playlist.cover_image_url ? (
          <img src={playlist.cover_image_url} alt="" />
        ) : (
          <div className="artist-public-card-placeholder" aria-hidden="true" />
        )}
      </div>
      <div className="artist-public-card-copy">
        <h3>{playlist.name}</h3>
        <p>{formatTrackCount(playlist.track_count)}</p>
        {playlist.description ? (
          <div className="artist-public-card-description">{playlist.description}</div>
        ) : null}
      </div>
    </article>
  );
}

export default function PublicArtistPageView({
  data,
  embedded = false,
}: PublicArtistPageViewProps) {
  const { artist, songs, releases, playlists } = data;
  const externalLinks = [
    ["Website", normalizeExternalUrl(artist.website_url)],
    ["Instagram", normalizeExternalUrl(artist.instagram_url)],
    ["Spotify", normalizeExternalUrl(artist.spotify_url)],
    ["YouTube", normalizeExternalUrl(artist.youtube_url)],
  ].filter((item): item is [string, string] => Boolean(item[1]));
  const showProfilePanel = Boolean(
    artist.bio || artist.location || externalLinks.length > 0,
  );
  const RootElement = embedded ? "div" : "main";

  return (
    <>
      <style>{`
        .artist-public-page {
          margin-top: var(--filmwave-header-height);
          min-height: calc(100vh - var(--filmwave-header-height));
          overflow-x: clip;
          background: var(--bg-primary);
          color: var(--text-primary);
          transition: margin-left 0.2s ease;
        }

        .artist-public-page.artist-public-page-embedded {
          margin-top: 0;
          min-height: 0;
        }

        .artist-public-shell {
          padding: 0 var(--filmwave-page-gutter);
        }

        .artist-public-top {
          padding: clamp(34px, 3vw, 50px) 0 clamp(44px, 4vw, 60px);
        }

        .artist-public-type {
          margin-bottom: clamp(16px, 1.4vw, 22px);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: clamp(17px, 1.35vw, 22px);
          font-weight: 400;
          letter-spacing: -0.035em;
          line-height: 1;
        }

        .artist-public-feature-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(0, 0.98fr);
          gap: clamp(34px, 4vw, 72px);
          align-items: start;
        }

        .artist-public-feature-media {
          position: relative;
          width: 100%;
          min-height: 0;
          aspect-ratio: 1.86 / 1;
          overflow: hidden;
          background: var(--bg-secondary);
        }

        .artist-public-feature-image,
        .artist-public-feature-fallback {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .artist-public-feature-image {
          display: block;
          object-fit: cover;
        }

        .artist-public-feature-fallback {
          background:
            radial-gradient(circle at 68% 24%, rgba(255,255,255,0.08), transparent 28%),
            linear-gradient(145deg, var(--bg-secondary), var(--bg-tertiary));
        }

        .artist-public-feature-copy {
          display: flex;
          min-width: 0;
          flex-direction: column;
        }

        .artist-public-name {
          margin: -0.08em 0 0;
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: clamp(66px, 7.8vw, 98px);
          font-weight: 400;
          letter-spacing: -0.035em;
          line-height: 0.96;
        }

        .artist-public-summary-row {
          display: grid;
          grid-template-columns: minmax(150px, 190px) minmax(0, 1fr);
          gap: clamp(26px, 3vw, 48px);
          align-items: start;
          margin-top: clamp(24px, 2.5vw, 34px);
        }

        .artist-public-stats {
          display: grid;
          gap: 2px;
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: clamp(15px, 1.05vw, 18px);
          font-weight: 300;
          letter-spacing: 0;
          line-height: 1.15;
          text-transform: uppercase;
        }

        .artist-public-intro {
          max-width: 560px;
          margin: 0;
          color: var(--text-primary);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: clamp(18px, 1.3vw, 24px);
          font-weight: 300;
          letter-spacing: 0;
          line-height: 1.35;
        }

        .artist-public-profile-panel {
          margin-top: clamp(34px, 3.5vw, 52px);
        }

        .artist-public-profile-heading {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 18px;
        }

        .artist-public-profile-label {
          color: var(--text-primary);
          font-family: var(--font-roboto-mono-filmwave), monospace;
          font-size: 18px;
          font-weight: 300;
          letter-spacing: 0;
          line-height: 1;
          text-transform: uppercase;
        }

        .artist-public-profile-meta {
          display: flex;
          min-width: 0;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 8px 18px;
          color: var(--text-muted);
          font-size: 9px;
          line-height: 1.2;
        }

        .artist-public-links {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: flex-end;
          gap: 8px 14px;
        }

        .artist-public-links a {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--text-muted);
          transition: color 150ms ease;
        }

        .artist-public-links a:hover {
          color: var(--text-primary);
        }

        .artist-public-links svg {
          display: block;
          flex: 0 0 auto;
        }

        .artist-public-bio {
          margin: 14px 0 0;
          color: var(--text-secondary);
          font-family: var(--font-aktiv-grotesk), sans-serif;
          font-size: clamp(12px, 0.82vw, 14px);
          font-weight: 300;
          letter-spacing: -0.012em;
          line-height: 1.65;
        }

        .artist-public-section {
          padding: 0 0 44px;
        }

        .artist-public-section-header {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 16px;
        }

        .artist-public-section-title {
          margin: 0;
          font-family: var(--font-aktiv-grotesk);
          font-size: 22px;
          font-weight: 500;
          line-height: 1;
          letter-spacing: -0.04em;
        }

        .artist-public-section-count {
          color: var(--text-muted);
          font-size: 11px;
        }

        .artist-public-music {
          margin: 0 calc(var(--filmwave-page-gutter) * -1);
        }

        .artist-public-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 22px;
        }

        .artist-public-card {
          min-width: 0;
        }

        .artist-public-card-art {
          position: relative;
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: 0;
          background: var(--bg-secondary);
        }

        .artist-public-card-art img,
        .artist-public-card-placeholder {
          width: 100%;
          height: 100%;
        }

        .artist-public-card-art img {
          display: block;
          object-fit: cover;
        }

        .artist-public-card-placeholder {
          background:
            radial-gradient(circle at 68% 22%, rgba(255,255,255,0.08), transparent 26%),
            linear-gradient(145deg, var(--bg-secondary), var(--bg-tertiary));
        }

        .artist-public-card-copy {
          padding-top: 10px;
        }

        .artist-public-card-copy h3 {
          margin: 0;
          overflow: hidden;
          color: var(--text-primary);
          font-size: 13px;
          font-weight: 500;
          line-height: 1.35;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .artist-public-card-copy p {
          margin: 4px 0 0;
          color: var(--text-muted);
          font-size: 11px;
          line-height: 1.45;
        }

        .artist-public-card-description {
          display: -webkit-box;
          margin-top: 7px;
          overflow: hidden;
          color: var(--text-secondary);
          font-size: 11px;
          line-height: 1.5;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .artist-public-empty {
          display: flex;
          min-height: 180px;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          font-size: 12px;
        }

        .artist-public-footer {
          padding-top: 10px;
        }

        @media (max-width: 1080px) {
          .artist-public-feature-grid {
            grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
            gap: 30px;
          }

          .artist-public-name {
            font-size: clamp(58px, 7.5vw, 82px);
          }
        }

        @media (max-width: 980px) {
          .artist-public-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 820px) {
          .artist-public-top {
            padding-top: 28px;
          }

          .artist-public-feature-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }

          .artist-public-feature-media {
            aspect-ratio: 1.75 / 1;
          }

          .artist-public-feature-copy {
            display: block;
          }

          .artist-public-name {
            font-size: clamp(52px, 12vw, 78px);
          }

          .artist-public-profile-panel {
            margin-top: 38px;
          }
        }

        @media (max-width: 760px) {
          .artist-public-summary-row {
            grid-template-columns: 1fr;
            gap: 18px;
          }

          .artist-public-profile-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 12px;
          }

          .artist-public-profile-meta,
          .artist-public-links {
            justify-content: flex-start;
          }

          .artist-public-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }
        }

        @media (max-width: 480px) {
          .artist-public-name {
            font-size: clamp(46px, 15vw, 64px);
          }

          .artist-public-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <RootElement
        className={`artist-public-page${embedded ? " artist-public-page-embedded" : ""}`}
      >
        <div className="artist-public-shell">
          <section className="artist-public-top">
            {artist.designation ? (
              <div className="artist-public-type">{artist.designation}</div>
            ) : null}

            <div className="artist-public-feature-grid">
              <div className="artist-public-feature-media">
                {artist.hero_image_url ? (
                  <img
                    src={artist.hero_image_url}
                    alt=""
                    className="artist-public-feature-image"
                  />
                ) : (
                  <div
                    className="artist-public-feature-fallback"
                    aria-hidden="true"
                  />
                )}
              </div>

              <div className="artist-public-feature-copy">
                <h1 className="artist-public-name">{artist.name}</h1>

                <div className="artist-public-summary-row">
                  <div className="artist-public-stats">
                    <span>
                      {songs.length} {songs.length === 1 ? "song" : "songs"}
                    </span>
                    <span>
                      {releases.length} albums / releases
                    </span>
                  </div>

                  {artist.intro_text ? (
                    <p className="artist-public-intro">{artist.intro_text}</p>
                  ) : null}
                </div>

                {showProfilePanel ? (
                  <div className="artist-public-profile-panel">
                    <div className="artist-public-profile-heading">
                      <span className="artist-public-profile-label">
                        Artist Profile
                      </span>

                      {(artist.location || externalLinks.length > 0) ? (
                        <div className="artist-public-profile-meta">
                          {artist.location ? <span>{artist.location}</span> : null}
                          {externalLinks.length > 0 ? (
                            <div className="artist-public-links">
                              {externalLinks.map(([label, href]) => (
                                <a
                                  key={label}
                                  href={href}
                                  target="_blank"
                                  rel="noreferrer"
                                >
                                  {label === "Instagram" ? <InstagramIcon /> : null}
                                  <span>{label}</span>
                                </a>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>

                    {artist.bio ? (
                      <p className="artist-public-bio">{artist.bio}</p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="artist-public-section">
            <div className="artist-public-section-header">
              <h2 className="artist-public-section-title">Music</h2>
              <span className="artist-public-section-count">
                {songs.length} {songs.length === 1 ? "track" : "tracks"}
              </span>
            </div>
            {songs.length > 0 ? (
              <div className="artist-public-music">
                <PublicArtistMusic songs={songs} />
              </div>
            ) : (
              <div className="artist-public-empty">No published music yet.</div>
            )}
          </section>

          {releases.length > 0 ? (
            <section className="artist-public-section">
              <div className="artist-public-section-header">
                <h2 className="artist-public-section-title">Releases</h2>
                <span className="artist-public-section-count">
                  {releases.length} {releases.length === 1 ? "release" : "releases"}
                </span>
              </div>
              <div className="artist-public-grid">
                {releases.map((release) => (
                  <ReleaseCard key={release.id} release={release} />
                ))}
              </div>
            </section>
          ) : null}

          {playlists.length > 0 ? (
            <section className="artist-public-section">
              <div className="artist-public-section-header">
                <h2 className="artist-public-section-title">Playlists</h2>
                <span className="artist-public-section-count">
                  {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}
                </span>
              </div>
              <div className="artist-public-grid">
                {playlists.map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            </section>
          ) : null}

          <div className="artist-public-footer">
            <Footer />
          </div>
        </div>
      </RootElement>
    </>
  );
}
