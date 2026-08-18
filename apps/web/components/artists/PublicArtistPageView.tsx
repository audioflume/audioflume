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

        .artist-public-hero {
          position: relative;
          min-height: 330px;
          margin: 0 calc(var(--filmwave-page-gutter) * -1);
          overflow: hidden;
          background: var(--bg-secondary);
        }

        .artist-public-hero-image,
        .artist-public-hero-fallback {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        .artist-public-hero-image {
          object-fit: cover;
        }

        .artist-public-hero-fallback {
          background:
            radial-gradient(circle at 72% 20%, rgba(255,255,255,0.08), transparent 34%),
            linear-gradient(145deg, var(--bg-secondary), var(--bg-tertiary));
        }

        .artist-public-hero::after {
          content: "";
          position: absolute;
          inset: 0;
          background:
            linear-gradient(to top, var(--bg-primary) 0%, color-mix(in srgb, var(--bg-primary) 78%, transparent) 24%, transparent 68%),
            linear-gradient(to right, color-mix(in srgb, var(--bg-primary) 54%, transparent), transparent 62%);
          pointer-events: none;
        }

        .artist-public-hero-content {
          position: relative;
          z-index: 1;
          display: flex;
          min-height: 330px;
          align-items: flex-end;
          gap: 22px;
          padding: 48px var(--filmwave-page-gutter) 28px;
        }

        .artist-public-avatar {
          display: flex;
          width: 112px;
          height: 112px;
          flex: 0 0 112px;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: 0;
          border-radius: 0;
          background: var(--bg-secondary);
          color: var(--text-secondary);
          font-family: var(--font-aktiv-grotesk);
          font-size: 36px;
          font-weight: 500;
        }

        .artist-public-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .artist-public-kicker {
          margin-bottom: 6px;
          color: var(--text-muted);
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .artist-public-name {
          margin: 0;
          font-family: var(--font-aktiv-grotesk);
          font-size: clamp(38px, 5vw, 62px);
          font-weight: 500;
          line-height: 0.94;
          letter-spacing: -0.055em;
        }

        .artist-public-location {
          margin-top: 10px;
          color: var(--text-secondary);
          font-size: 12px;
        }

        .artist-public-profile {
          display: grid;
          grid-template-columns: minmax(0, 720px) auto;
          gap: 28px;
          align-items: start;
          padding: 28px 0 40px;
        }

        .artist-public-bio {
          margin: 0;
          color: var(--text-secondary);
          font-size: 13px;
          line-height: 1.7;
        }

        .artist-public-links {
          display: flex;
          flex-wrap: wrap;
          justify-content: flex-end;
          gap: 14px;
        }

        .artist-public-links a {
          color: var(--text-secondary);
          font-size: 12px;
          transition: color 150ms ease;
        }

        .artist-public-links a:hover {
          color: var(--text-primary);
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

        @media (max-width: 980px) {
          .artist-public-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .artist-public-hero,
          .artist-public-hero-content {
            min-height: 290px;
          }

          .artist-public-hero-content {
            gap: 16px;
            padding: 42px var(--filmwave-page-gutter) 24px;
          }

          .artist-public-avatar {
            width: 86px;
            height: 86px;
            flex-basis: 86px;
            border-radius: 0;
            font-size: 28px;
          }

          .artist-public-profile {
            grid-template-columns: 1fr;
            gap: 18px;
            padding-bottom: 34px;
          }

          .artist-public-links {
            justify-content: flex-start;
          }

          .artist-public-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }
        }

        @media (max-width: 480px) {
          .artist-public-hero-content {
            align-items: flex-end;
          }

          .artist-public-avatar {
            width: 72px;
            height: 72px;
            flex-basis: 72px;
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
          <section className="artist-public-hero">
            {artist.hero_image_url ? (
              <img
                src={artist.hero_image_url}
                alt=""
                className="artist-public-hero-image"
              />
            ) : (
              <div className="artist-public-hero-fallback" aria-hidden="true" />
            )}

            <div className="artist-public-hero-content">
              <div className="artist-public-avatar">
                {artist.profile_image_url ? (
                  <img src={artist.profile_image_url} alt="" />
                ) : (
                  <span>{artist.name.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="artist-public-kicker">Artist</div>
                <h1 className="artist-public-name">{artist.name}</h1>
                {artist.location ? (
                  <div className="artist-public-location">{artist.location}</div>
                ) : null}
              </div>
            </div>
          </section>

          {(artist.bio || externalLinks.length > 0) && (
            <section className="artist-public-profile">
              <div>
                {artist.bio ? <p className="artist-public-bio">{artist.bio}</p> : null}
              </div>
              {externalLinks.length > 0 ? (
                <div className="artist-public-links">
                  {externalLinks.map(([label, href]) => (
                    <a key={label} href={href} target="_blank" rel="noreferrer">
                      {label}
                    </a>
                  ))}
                </div>
              ) : null}
            </section>
          )}

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
