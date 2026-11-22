import "../home-page.css";
import ShelvedDiscoverPage from "../discover/ShelvedDiscoverPage";
import Discover2SongBlocks from "./Discover2SongBlocks";
import ActiveDiscoverBanner from "./ActiveDiscoverBanner";
import Discover2WatchingArtists from "./Discover2WatchingArtists";

export default function Discover2Page() {
  return <ShelvedDiscoverPage liveContent discover2Layout topBanner={<><ActiveDiscoverBanner /><Discover2WatchingArtists /><Discover2SongBlocks /></>} />;
}
