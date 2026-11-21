import "../home-page.css";
import ShelvedDiscoverPage from "../discover/ShelvedDiscoverPage";
import Discover2SongBlocks from "./Discover2SongBlocks";
import ActiveDiscoverBanner from "./ActiveDiscoverBanner";
import Discover2StorytellingTracks from "./Discover2StorytellingTracks";

export default function Discover2Page() {
  return <ShelvedDiscoverPage liveContent discover2Layout topBanner={<><ActiveDiscoverBanner /><Discover2StorytellingTracks /></>} afterFeaturedSongs={<Discover2SongBlocks />} />;
}
