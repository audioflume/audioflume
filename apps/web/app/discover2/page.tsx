import "../home-page.css";
import ShelvedDiscoverPage from "../discover/ShelvedDiscoverPage";
import Discover2SongBlocks, { Discover2NewSongs } from "./Discover2SongBlocks";
import Link from "next/link";
import ActiveDiscoverBanner from "./ActiveDiscoverBanner";
import Discover2WatchingArtists from "./Discover2WatchingArtists";
import Discover2Playlists from "./Discover2Playlists";

export default function Discover2Page() {
  return <ShelvedDiscoverPage liveContent discover2Layout topBanner={<><Discover2WatchingArtists /><Discover2SongBlocks /><Discover2Playlists /><ActiveDiscoverBanner />
      <section className="discover2-new-music-section" aria-label="Newly added and trending music">
        <h2>
          <Link className="discover2-watching-heading-link" href="/music" aria-label="Explore new music">
            <span className="discover2-watching-heading-default" aria-hidden="true">Newly added &amp; trending music</span>
            <span className="discover2-watching-heading-hover" aria-hidden="true">
              Explore new music
              <svg className="discover2-watching-heading-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.7" strokeLinecap="butt" strokeLinejoin="miter" aria-hidden="true">
                <path d="M4 21 19 5M4 5h15v15" />
              </svg>
            </span>
          </Link>
        </h2>
        <Discover2NewSongs />
      </section></>} />;
}
