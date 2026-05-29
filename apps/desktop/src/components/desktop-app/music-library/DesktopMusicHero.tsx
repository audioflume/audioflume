import ArrowUpRightIcon from "../../icons/ArrowUpRightIcon";
import MusicIcon from "../../icons/MusicIcon";
import { DESKTOP_SYNC_IMAGE, MUSIC_HERO_IMAGE } from "./musicLibraryUtils";

export default function DesktopMusicHero({
  hidden,
  shownCount,
  totalCount,
  musicHeroHovered,
  desktopSyncHovered,
  onMusicHeroHoverChange,
  onDesktopSyncHoverChange,
}: {
  hidden: boolean;
  shownCount: number;
  totalCount: number;
  musicHeroHovered: boolean;
  desktopSyncHovered: boolean;
  onMusicHeroHoverChange: (hovered: boolean) => void;
  onDesktopSyncHoverChange: (hovered: boolean) => void;
}) {
  return (
    <div
      className={`desktop-music-hero-wrap${hidden ? " is-hidden" : ""}`}
      aria-hidden={hidden}
    >
      <div className="desktop-music-hero-grid">
        <article
          className="desktop-music-hero"
          onMouseEnter={() => onMusicHeroHoverChange(true)}
          onMouseLeave={() => onMusicHeroHoverChange(false)}
          style={{
            backgroundImage: `linear-gradient(90deg, rgba(0,0,0,0.78) 0%, rgba(0,0,0,0.5) 52%, rgba(0,0,0,0.2) 100%), linear-gradient(180deg, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.3) 100%), url("${MUSIC_HERO_IMAGE}")`,
            backgroundSize: `100% 100%, 100% 100%, ${
              musicHeroHovered ? "104%" : "100%"
            } auto`,
          }}
        >
          <div className="desktop-hero-pill">
            <MusicIcon size={11} />
            <span>Music Library</span>
          </div>

          <div>
            <h1>Find the cue that fits the cut.</h1>

            <div className="desktop-music-hero-bottom">
              <p>
                Move through the library like a visual treatment — documentary
                warmth, after-dark tension, open travel cues, and polished brand
                motion.
              </p>

              <div className="desktop-music-count-pills">
                <span>{shownCount} shown</span>
                <span>{totalCount} songs</span>
              </div>
            </div>
          </div>
        </article>

        <article
          className="desktop-sync-hero"
          onMouseEnter={() => onDesktopSyncHoverChange(true)}
          onMouseLeave={() => onDesktopSyncHoverChange(false)}
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.16) 0%, rgba(0,0,0,0.78) 100%), linear-gradient(90deg, rgba(0,0,0,0.26), rgba(0,0,0,0.04)), url("${DESKTOP_SYNC_IMAGE}")`,
            backgroundSize: `100% 100%, 100% 100%, auto ${
              desktopSyncHovered ? "104%" : "100%"
            }`,
          }}
        >
          <div className="desktop-hero-pill">Desktop Sync</div>

          <div className="desktop-sync-hero-copy">
            <h2>Local files, ready to cut.</h2>
            <p>
              Sync songs to your desktop and drag them straight into Premiere,
              Resolve, or your editing timeline.
            </p>

            <button type="button" className="desktop-sync-hero-button">
              Desktop Sync
              <ArrowUpRightIcon />
            </button>
          </div>
        </article>
      </div>
    </div>
  );
}
