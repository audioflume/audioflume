import "../home-page.css";
import ShelvedDiscoverPage from "../discover/ShelvedDiscoverPage";
import ActiveDiscoverBanner from "./ActiveDiscoverBanner";
import Discover2SongBlocks from "./Discover2SongBlocks";

export default function Discover2Page() {
  return <ShelvedDiscoverPage liveContent discover2Layout afterFeaturedSongs={<Discover2SongBlocks />} afterPlaylists={<ActiveDiscoverBanner />} />;
}
