import "../home-page.css";
import ShelvedDiscoverPage from "../discover/ShelvedDiscoverPage";
import Discover2SongBlocks from "./Discover2SongBlocks";
import ActiveDiscoverBanner from "./ActiveDiscoverBanner";
import Discover2Playlists from "./Discover2Playlists";

export default function Discover2Page() {
  return <ShelvedDiscoverPage liveContent discover2Layout topBanner={<><ActiveDiscoverBanner /><Discover2Playlists /><Discover2SongBlocks /></>} />;
}
